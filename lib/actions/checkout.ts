"use server";

import { after } from "next/server";
import { z } from "zod";
import { checkoutItemSchema, checkoutSchema, emailSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isRazorpayConfigured, isServiceRoleConfigured } from "@/lib/server-env";
import { getSiteSettings } from "@/lib/data/content";
import { rateLimit } from "@/lib/rate-limit";
import { razorpay, toPaise, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { onOrderPlaced } from "@/lib/orders/notify";
import { validateCart } from "./cart";
import type { SavedAddress } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Quote: server-side totals for the cart and checkout pages           */
/* ------------------------------------------------------------------ */
export interface Quote {
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  total: number;
  gst: number;
  coupon: { code: string; message: string; valid: boolean } | null;
  autoApplied: boolean;
  unavailable: string[]; // variant ids that can't be bought
  prices: Record<string, number>; // variantId → current unit price
  freeShippingThreshold: number;
}

const quoteInput = z.object({
  items: z.array(checkoutItemSchema).max(30),
  couponCode: z.string().trim().max(40).optional().nullable(),
  email: z.string().optional().nullable(),
  paymentMethod: z.enum(["razorpay", "cod"]).optional(),
});

export async function quoteCheckout(input: unknown): Promise<Quote> {
  const { items, couponCode, email, paymentMethod } = quoteInput.parse(input);
  const { shipping } = await getSiteSettings();
  const lines = await validateCart(items);
  let subtotal = 0;
  let gst = 0;
  const unavailable: string[] = [];
  const prices: Record<string, number> = {};
  lines.forEach((l, i) => {
    prices[l.variantId] = l.price;
    const qty = items[i].quantity;
    if (!l.available || l.stock < qty) {
      unavailable.push(l.variantId);
      return;
    }
    const line = (l.price + (l.charmPrice ?? 0)) * qty;
    subtotal += line;
    gst += (line * 18) / 118;
  });

  let discount = 0;
  let coupon: Quote["coupon"] = null;
  let autoApplied = false;
  if (isServiceRoleConfigured() && subtotal > 0) {
    const user = await getCurrentUser();
    const cleanEmail = email ? emailSchema.safeParse(email) : null;
    const admin = createAdminClient();
    if (couponCode) {
      const { data } = await admin.rpc("evaluate_coupon", {
        p_code: couponCode,
        p_subtotal: subtotal,
        p_user_id: user?.id,
        p_email: cleanEmail?.success ? cleanEmail.data : (user?.email ?? undefined),
      });
      const r = data?.[0];
      coupon = { code: couponCode.toUpperCase(), message: r?.message ?? "This code is not valid.", valid: !!r?.coupon_id };
      if (r?.coupon_id) discount = Number(r.discount);
    } else {
      const { data } = await admin.rpc("best_auto_coupon", {
        p_subtotal: subtotal,
        p_user_id: user?.id,
        p_email: cleanEmail?.success ? cleanEmail.data : undefined,
      });
      const r = data?.[0];
      if (r?.coupon_id) {
        discount = Number(r.discount);
        coupon = { code: r.code, message: "Automatically applied", valid: true };
        autoApplied = true;
      }
    }
  } else if (couponCode) {
    coupon = { code: couponCode.toUpperCase(), message: "Coupons work once Supabase is connected.", valid: false };
  }

  const shippingFee = subtotal === 0 ? 0 : subtotal - discount >= shipping.free_threshold ? 0 : shipping.flat_rate;
  const codFee = paymentMethod === "cod" ? shipping.cod_fee : 0;
  const total = Math.max(0, subtotal - discount) + shippingFee + codFee;
  return {
    subtotal,
    discount,
    shipping: shippingFee,
    codFee,
    total,
    gst: subtotal ? Math.round(gst * ((subtotal - discount) / subtotal) * 100) / 100 : 0,
    coupon,
    autoApplied,
    unavailable,
    prices,
    freeShippingThreshold: shipping.free_threshold,
  };
}

/* ------------------------------------------------------------------ */
/* Checkout context (signed-in user + saved addresses)                 */
/* ------------------------------------------------------------------ */
export async function getCheckoutContext(): Promise<{
  user: { email: string | null; name: string | null; phone: string | null } | null;
  addresses: SavedAddress[];
}> {
  if (!isSupabaseConfigured) return { user: null, addresses: [] };
  const user = await getCurrentUser();
  if (!user) return { user: null, addresses: [] };
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return { user: { email: user.email, name: user.fullName, phone: user.phone }, addresses: (data ?? []) as SavedAddress[] };
}

/* ------------------------------------------------------------------ */
/* Place order                                                          */
/* ------------------------------------------------------------------ */
export type PlaceOrderResult =
  | { ok: false; message: string }
  | { ok: true; kind: "cod"; orderNumber: string; redirect: string }
  | {
      ok: true;
      kind: "razorpay";
      orderId: string;
      orderNumber: string;
      accessToken: string;
      razorpay: { keyId: string; orderId: string; amount: number; name: string; email: string; contact: string };
    };

const ERRORS: Record<string, string> = {
  OUT_OF_STOCK: "Sorry — {x} just sold out. Please update your bag.",
  PRODUCT_UNAVAILABLE: "One of the items in your bag is no longer available.",
  CHARM_UNAVAILABLE: "One of the charms in your bag is no longer available.",
  COUPON_INVALID: "{x}",
  COD_DISABLED: "Cash on Delivery isn't available right now. Please pay online.",
  COD_LIMIT: "Cash on Delivery is available for orders up to ₹{x}. Please pay online.",
  EMPTY_CART: "Your bag is empty.",
  INVALID_EMAIL: "Please enter a valid email address.",
  ACCOUNT_BLOCKED: "We couldn't place this order. Please contact us.",
};

function friendlyError(message: string) {
  const [code, ...rest] = message.split(":");
  const tpl = ERRORS[code.trim()];
  return tpl ? tpl.replace("{x}", rest.join(":").trim()) : "We couldn't place your order. Please try again.";
}

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  if (!isSupabaseConfigured || !isServiceRoleConfigured()) {
    return { ok: false, message: "Checkout is in demo mode. Connect Supabase (see docs/SETUP.md) to take real orders." };
  }
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your details." };
  const d = parsed.data;
  if (!(await rateLimit("checkout", 8, 600))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  if (d.paymentMethod === "razorpay" && !isRazorpayConfigured()) {
    return { ok: false, message: "Online payments aren't configured yet. Please choose Cash on Delivery." };
  }

  const user = await getCurrentUser();
  const admin = createAdminClient();
  const toAddr = (a: typeof d.shipping) => ({ ...a, line2: a.line2 || null, landmark: a.landmark || null, country: "India" });

  const { data: created, error } = await admin.rpc("create_order", {
    p: {
      user_id: user?.id ?? null,
      email: d.email,
      phone: d.phone,
      customer_name: d.shipping.full_name,
      payment_method: d.paymentMethod,
      coupon_code: d.couponCode || null,
      customer_notes: d.notes || null,
      session_id: d.sessionId ?? null,
      utm: d.utm ?? null,
      shipping_address: toAddr(d.shipping),
      billing_address: d.billingSameAsShipping || !d.billing ? toAddr(d.shipping) : toAddr(d.billing),
      items: d.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity, charm_id: i.charmId ?? null })),
    },
  });
  if (error || !created) return { ok: false, message: friendlyError(error?.message ?? "") };
  const order = created as { id: string; order_number: string; access_token: string; total: number };

  if (user && d.saveAddress) {
    const supabase = await createClient();
    const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    await supabase.from("addresses").insert({ user_id: user.id, ...toAddr(d.shipping), is_default: !count });
  }
  if (user && !user.phone)
    await admin
      .from("profiles")
      .update({ phone: d.phone, full_name: user.fullName ?? d.shipping.full_name })
      .eq("id", user.id);

  if (d.paymentMethod === "cod") {
    await admin.from("payments").insert({ order_id: order.id, provider: "cod", amount: order.total, status: "created", method: "cod" });
    await admin.from("analytics_events").insert({
      event_name: "purchase",
      session_id: d.sessionId ?? "server",
      user_id: user?.id ?? null,
      order_id: order.id,
      value: order.total,
      path: "/checkout",
      metadata: { method: "cod" },
    });
    after(() => onOrderPlaced(order.id));
    return {
      ok: true,
      kind: "cod",
      orderNumber: order.order_number,
      redirect: `/checkout/success?order=${order.order_number}&t=${order.access_token}`,
    };
  }

  try {
    const rp = await razorpay().orders.create({
      amount: toPaise(Number(order.total)),
      currency: "INR",
      receipt: order.order_number,
      notes: { order_id: order.id, order_number: order.order_number },
    });
    await admin.from("orders").update({ razorpay_order_id: rp.id }).eq("id", order.id);
    await admin.from("payments").insert({ order_id: order.id, razorpay_order_id: rp.id, amount: order.total, status: "created" });
    return {
      ok: true,
      kind: "razorpay",
      orderId: order.id,
      orderNumber: order.order_number,
      accessToken: order.access_token,
      razorpay: {
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        orderId: rp.id,
        amount: Number(rp.amount),
        name: d.shipping.full_name,
        email: d.email,
        contact: d.phone,
      },
    };
  } catch (e) {
    console.error("[checkout] razorpay order failed", e);
    await admin.rpc("release_order", { p_order_id: order.id, p_reason: "Payment gateway error" });
    return { ok: false, message: "We couldn't reach the payment gateway. Please try again in a moment." };
  }
}

/* ------------------------------------------------------------------ */
/* Payment verification (called by the Razorpay checkout handler)      */
/* ------------------------------------------------------------------ */
const verifySchema = z.object({
  orderId: z.string().uuid(),
  accessToken: z.string().min(16).max(80),
  razorpay_order_id: z.string().min(5).max(60),
  razorpay_payment_id: z.string().min(5).max(60),
  razorpay_signature: z.string().min(16).max(200),
  sessionId: z.string().max(80).optional(),
});

export async function verifyPayment(input: unknown): Promise<{ ok: boolean; message?: string; redirect?: string }> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid payment response." };
  const d = parsed.data;
  if (!verifyPaymentSignature(d.razorpay_order_id, d.razorpay_payment_id, d.razorpay_signature)) {
    return { ok: false, message: "We couldn't verify this payment. If money was deducted, it will be refunded automatically." };
  }
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, access_token, total, razorpay_order_id, user_id")
    .eq("id", d.orderId)
    .single();
  if (!order || order.access_token !== d.accessToken || order.razorpay_order_id !== d.razorpay_order_id) {
    return { ok: false, message: "Order not found." };
  }

  // Confirm the amount with Razorpay itself (never trust the browser)
  let amount = toPaise(Number(order.total));
  let method: string | null = null;
  try {
    const payment = await razorpay().payments.fetch(d.razorpay_payment_id);
    amount = Number(payment.amount);
    method = payment.method ?? null;
    if (payment.status === "authorized") await razorpay().payments.capture(d.razorpay_payment_id, amount, "INR");
  } catch (e) {
    console.warn("[verify] could not fetch payment, relying on signature", e);
  }

  const { error } = await admin.rpc("mark_order_paid", {
    p_order_id: order.id,
    p_razorpay_order_id: d.razorpay_order_id,
    p_razorpay_payment_id: d.razorpay_payment_id,
    p_signature: d.razorpay_signature,
    p_amount_paise: amount,
    p_method: method ?? "razorpay",
  });
  if (error) {
    console.error("[verify] mark_order_paid", error.message);
    return { ok: false, message: "Payment received but we couldn't confirm your order automatically. Our team will contact you shortly." };
  }
  await admin.from("analytics_events").insert({
    event_name: "purchase",
    session_id: d.sessionId ?? "server",
    user_id: order.user_id,
    order_id: order.id,
    value: Number(order.total),
    path: "/checkout",
    metadata: { method: method ?? "razorpay" },
  });
  after(() => onOrderPlaced(order.id));
  return { ok: true, redirect: `/checkout/success?order=${order.order_number}&t=${order.access_token}` };
}

export async function reportPaymentFailure(input: unknown) {
  const d = z
    .object({
      orderId: z.string().uuid(),
      accessToken: z.string().max(80),
      code: z.string().max(80).optional(),
      description: z.string().max(500).optional(),
      paymentId: z.string().max(60).optional(),
      sessionId: z.string().max(80).optional(),
    })
    .safeParse(input);
  if (!d.success || !isServiceRoleConfigured()) return;
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, access_token, razorpay_order_id, total").eq("id", d.data.orderId).single();
  if (!order || order.access_token !== d.data.accessToken) return;
  await admin.from("payments").insert({
    order_id: order.id,
    razorpay_order_id: order.razorpay_order_id,
    razorpay_payment_id: d.data.paymentId ? `${d.data.paymentId}` : null,
    amount: order.total,
    status: "failed",
    error_code: d.data.code ?? null,
    error_description: d.data.description ?? null,
  });
  await admin
    .from("analytics_events")
    .insert({
      event_name: "payment_failed",
      session_id: d.data.sessionId ?? "server",
      order_id: order.id,
      value: Number(order.total),
      path: "/checkout",
      metadata: { code: d.data.code ?? null },
    });
}

/** Re-open Razorpay for an order that's still awaiting payment. */
export async function retryPayment(input: unknown): Promise<PlaceOrderResult> {
  const d = z.object({ orderNumber: z.string().max(20), accessToken: z.string().max(80) }).safeParse(input);
  if (!d.success || !isServiceRoleConfigured() || !isRazorpayConfigured()) return { ok: false, message: "Unable to retry payment." };
  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders")
    .select("id, order_number, access_token, total, status, razorpay_order_id, email, phone, customer_name")
    .eq("order_number", d.data.orderNumber)
    .single();
  if (!o || o.access_token !== d.data.accessToken) return { ok: false, message: "Order not found." };
  if (o.status !== "pending" || !o.razorpay_order_id)
    return { ok: false, message: "This order can no longer be paid. Please place a new order." };
  return {
    ok: true,
    kind: "razorpay",
    orderId: o.id,
    orderNumber: o.order_number,
    accessToken: o.access_token,
    razorpay: {
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      orderId: o.razorpay_order_id,
      amount: toPaise(Number(o.total)),
      name: o.customer_name ?? "",
      email: o.email,
      contact: o.phone ?? "",
    },
  };
}
