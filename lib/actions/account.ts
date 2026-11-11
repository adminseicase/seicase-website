"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addressSchema, indianPhone, returnRequestSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email/send";
import { refundOrder } from "@/lib/orders/refund";
import { orderUrl } from "@/lib/orders/notify";
import { rateLimit } from "@/lib/rate-limit";

type Result = { ok: boolean; message: string };

async function authorizeOrder(orderId: string, token?: string | null) {
  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders")
    .select("id, user_id, access_token, status, email, customer_name, order_number, payment_status, payment_method, delivered_at")
    .eq("id", orderId)
    .single();
  if (!o) return null;
  if (
    token &&
    Buffer.from(token).length === Buffer.from(o.access_token).length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(o.access_token))
  )
    return o;
  const user = await getCurrentUser();
  if (user && user.id === o.user_id) return o;
  return null;
}

/** Customer cancels an order that hasn't shipped. Stock is restored; prepaid orders are refunded. */
export async function cancelOrder(input: unknown): Promise<Result> {
  const d = z.object({ orderId: z.string().uuid(), token: z.string().max(80).optional() }).safeParse(input);
  if (!d.success) return { ok: false, message: "Invalid request" };
  const o = await authorizeOrder(d.data.orderId, d.data.token);
  if (!o) return { ok: false, message: "Order not found" };
  if (!["placed", "confirmed"].includes(o.status))
    return { ok: false, message: "This order has already shipped and can't be cancelled. You can request a return after delivery." };
  const admin = createAdminClient();
  await admin.rpc("release_order", { p_order_id: o.id, p_reason: "Cancelled by customer" });
  if (o.payment_method === "razorpay" && o.payment_status === "paid") await refundOrder(o.id, undefined, "Customer cancellation");
  after(() =>
    sendEmail({
      to: o.email,
      subject: `Your order #${o.order_number} has been cancelled`,
      template: {
        kind: "order-status",
        orderNumber: o.order_number,
        customerName: o.customer_name ?? "there",
        status: "cancelled",
        orderUrl: orderUrl(o.order_number, o.access_token),
      },
    }),
  );
  revalidatePath("/account");
  return { ok: true, message: "Your order has been cancelled." };
}

export async function requestReturn(input: unknown): Promise<Result> {
  const parsed = returnRequestSchema.extend({ token: z.string().max(80).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  if (!(await rateLimit("return", 5, 3600))) return { ok: false, message: "Please try again later." };
  const o = await authorizeOrder(d.orderId, d.token);
  if (!o) return { ok: false, message: "Order not found" };
  if (o.status !== "delivered") return { ok: false, message: "Returns open once your order is delivered." };
  const admin = createAdminClient();
  const { data: open } = await admin.from("returns").select("id").eq("order_id", o.id).neq("status", "rejected").maybeSingle();
  if (open) return { ok: false, message: "A request for this order is already in progress." };
  const { error } = await admin.from("returns").insert({
    order_id: o.id,
    user_id: o.user_id,
    order_item_ids: d.itemIds,
    type: d.type,
    reason: d.reason,
    details: d.details || null,
    images: d.images ?? [],
  });
  if (error) return { ok: false, message: "We couldn't submit your request." };
  after(() =>
    sendEmail({
      to: o.email,
      subject: `We've received your ${d.type} request for #${o.order_number}`,
      template: { kind: "return-update", customerName: o.customer_name ?? "there", orderNumber: o.order_number, status: "requested" },
    }),
  );
  revalidatePath("/account");
  return { ok: true, message: "Request received. We'll get back to you within one business day." };
}

/* ------------------------------- profile ------------------------------- */
export async function updateProfile(input: unknown): Promise<Result> {
  const d = z
    .object({
      full_name: z.string().trim().min(2).max(80),
      phone: indianPhone.optional().or(z.literal("")),
      marketing_opt_in: z.boolean().optional(),
    })
    .safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0]?.message ?? "Please check your details" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: d.data.full_name, phone: d.data.phone || null, marketing_opt_in: d.data.marketing_opt_in ?? false })
    .eq("id", user.id);
  if (error) return { ok: false, message: "Couldn't save your details" };
  revalidatePath("/account", "layout");
  return { ok: true, message: "Details saved" };
}

export async function changePassword(input: unknown): Promise<Result> {
  const d = z.object({ password: z.string().min(8, "Use at least 8 characters").max(72) }).safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: d.data.password });
  return error ? { ok: false, message: error.message } : { ok: true, message: "Password updated" };
}

/* ------------------------------ addresses ------------------------------ */
const savedAddressSchema = addressSchema.extend({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(30).optional(),
  is_default: z.boolean().optional(),
});

export async function saveAddress(input: unknown): Promise<Result> {
  const d = savedAddressSchema.safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0]?.message ?? "Please check the address" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in" };
  const supabase = await createClient();
  const { id, ...rest } = d.data;
  const row = { ...rest, line2: rest.line2 || null, landmark: rest.landmark || null, label: rest.label || "Home", user_id: user.id };
  const { error } = id
    ? await supabase.from("addresses").update(row).eq("id", id).eq("user_id", user.id)
    : await supabase.from("addresses").insert(row);
  if (error) return { ok: false, message: "Couldn't save this address" };
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved" };
}

export async function deleteAddress(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in" };
  const supabase = await createClient();
  await supabase.from("addresses").delete().eq("id", z.string().uuid().parse(id)).eq("user_id", user.id);
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address removed" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
