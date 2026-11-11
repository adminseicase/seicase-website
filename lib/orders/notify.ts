import "server-only";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEmail, sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { TAGS } from "@/lib/data/catalog";
import type { EmailOrder } from "@/emails/templates";
import type { Address } from "@/lib/types";

export const orderUrl = (orderNumber: string, token: string) => `${env.siteUrl}/orders/${orderNumber}?t=${token}`;

/** Loads an order in the shape the email templates expect. */
export async function loadEmailOrder(orderId: string): Promise<(EmailOrder & { email: string; accessToken: string }) | null> {
  const { data: o } = await createAdminClient()
    .from("orders")
    .select(
      "order_number, access_token, email, customer_name, subtotal, discount_total, shipping_total, cod_fee, total, payment_method, shipping_address, order_items(product_name, variant_name, quantity, unit_price, image_url)",
    )
    .eq("id", orderId)
    .single();
  if (!o) return null;
  const address = o.shipping_address as unknown as Address;
  return {
    orderNumber: o.order_number,
    accessToken: o.access_token,
    email: o.email,
    customerName: o.customer_name || address?.full_name || "there",
    items: o.order_items.map((i) => ({
      name: i.product_name,
      variant: i.variant_name,
      quantity: i.quantity,
      price: Number(i.unit_price),
      image: i.image_url,
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount_total),
    shipping: Number(o.shipping_total),
    codFee: Number(o.cod_fee),
    total: Number(o.total),
    paymentMethod: o.payment_method,
    address: { ...address, phone: address?.phone ?? "" },
    orderUrl: orderUrl(o.order_number, o.access_token),
  };
}

/** Customer confirmation + admin "new order" email, and refresh stock on product pages. */
export async function onOrderPlaced(orderId: string) {
  const order = await loadEmailOrder(orderId);
  if (!order) return;
  await sendEmail({
    to: order.email,
    subject: `Your seicase order #${order.orderNumber} is confirmed`,
    template: { kind: "order-confirmation", order },
  });
  const admin = await adminEmail();
  if (admin) {
    await sendEmail({
      to: admin,
      subject: `New order #${order.orderNumber} — ₹${order.total.toLocaleString("en-IN")}`,
      template: { kind: "admin-new-order", order, adminUrl: `${env.siteUrl}/admin/orders/${orderId}` },
    });
  }
  // Stock changed: refresh the affected product pages in the background
  const { data } = await createAdminClient().from("order_items").select("products(slug)").eq("order_id", orderId);
  for (const row of data ?? []) {
    const slug = (row.products as unknown as { slug: string } | null)?.slug;
    if (slug) revalidateTag(TAGS.product(slug), "max");
  }
  revalidateTag(TAGS.products, "max");
}
