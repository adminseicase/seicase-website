import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

/** Emails a cart reminder (once) and marks it as sent. */
export async function sendAbandonedCartEmail(cartId: string): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient();
  const { data: cart } = await admin
    .from("carts")
    .select(
      "id, email, user_id, status, recovery_token, reminder_sent_at, cart_items(quantity, unit_price, products(name, product_images(url, is_primary, sort_order)), product_variants(colour_name))",
    )
    .eq("id", cartId)
    .single();
  if (!cart) return { ok: false, message: "Cart not found" };
  if (!cart.email) return { ok: false, message: "No email on this cart" };
  if (cart.status !== "abandoned") return { ok: false, message: "This cart is no longer abandoned" };
  const { data: profile } = cart.user_id
    ? await admin.from("profiles").select("full_name, marketing_opt_in").eq("id", cart.user_id).maybeSingle()
    : { data: null };
  const items = cart.cart_items.map((ci) => {
    const p = ci.products as unknown as { name: string; product_images: { url: string; is_primary: boolean; sort_order: number }[] } | null;
    const img = p?.product_images.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
    return {
      name: p?.name ?? "Your item",
      variant: (ci.product_variants as unknown as { colour_name: string } | null)?.colour_name ?? null,
      quantity: ci.quantity,
      price: Number(ci.unit_price),
      image: img?.url ?? null,
    };
  });
  if (!items.length) return { ok: false, message: "Cart is empty" };
  const r = await sendEmail({
    to: cart.email,
    subject: "You left something beautiful behind",
    template: {
      kind: "abandoned-cart",
      name: profile?.full_name ?? null,
      items,
      recoverUrl: `${env.siteUrl}/cart?utm_source=email&utm_medium=abandoned_cart&utm_campaign=cart_recovery`,
    },
  });
  if (!r.ok) return { ok: false, message: r.error ?? "Email failed" };
  await admin.from("carts").update({ reminder_sent_at: new Date().toISOString() }).eq("id", cart.id);
  return { ok: true, message: `Reminder sent to ${cart.email}` };
}
