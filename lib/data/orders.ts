import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { isServiceRoleConfigured } from "@/lib/server-env";
import type { OrderWithItems } from "@/lib/types";

const ORDER_SELECT =
  "id, order_number, access_token, user_id, email, phone, customer_name, status, payment_status, payment_method, subtotal, discount_total, shipping_total, cod_fee, tax_total, total, coupon_code, shipping_address, billing_address, tracking_number, courier, tracking_url, created_at, placed_at, shipped_at, delivered_at, order_items(id, product_id, variant_id, charm_id, parent_item_id, product_name, variant_name, sku, image_url, unit_price, quantity, line_total), order_status_history(id, status, note, created_at, is_customer_visible), returns(id, return_number, status, type, created_at)";

export type ViewableOrder = OrderWithItems & {
  access_token: string;
  returns: { id: string; return_number: string; status: string; type: string; created_at: string }[];
};

function tokenOk(a: string, b: string | null | undefined) {
  if (!b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Returns an order if the viewer may see it: the signed-in owner, staff,
 * or anyone holding the order's private access token (guest email link).
 */
export async function getOrderForViewer(orderNumber: string, token?: string | null): Promise<{ order: ViewableOrder; viaToken: boolean } | null> {
  if (!isServiceRoleConfigured() || !/^SC\d{3,12}$/.test(orderNumber)) return null;
  const { data } = await createAdminClient().from("orders").select(ORDER_SELECT).eq("order_number", orderNumber).maybeSingle();
  if (!data) return null;
  const order = data as unknown as ViewableOrder;
  order.order_status_history = (order.order_status_history ?? [])
    .filter((h) => (h as unknown as { is_customer_visible: boolean }).is_customer_visible)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (tokenOk(order.access_token, token)) return { order, viaToken: true };
  const user = await getCurrentUser();
  if (user && (user.id === order.user_id || user.role === "admin" || user.role === "staff")) return { order, viaToken: false };
  return null;
}
