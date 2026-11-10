import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpay, toPaise } from "@/lib/payments/razorpay";
import { isRazorpayConfigured } from "@/lib/server-env";

/**
 * Refunds a prepaid order through Razorpay (full or partial amount in ₹).
 * COD orders are marked refunded for bookkeeping (pay the customer by UPI/bank).
 */
export async function refundOrder(orderId: string, amount?: number, note?: string): Promise<{ ok: boolean; message: string; refundId?: string }> {
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("id, total, refunded_total, payment_method, payment_status, order_number").eq("id", orderId).single();
  if (!o) return { ok: false, message: "Order not found" };
  const remaining = Number(o.total) - Number(o.refunded_total);
  const value = Math.min(remaining, amount ?? remaining);
  if (value <= 0) return { ok: false, message: "Nothing left to refund" };

  let refundId: string | undefined;
  if (o.payment_method === "razorpay") {
    if (o.payment_status !== "paid" && o.payment_status !== "partially_refunded") return { ok: false, message: "Order was not paid online" };
    if (!isRazorpayConfigured()) return { ok: false, message: "Razorpay keys missing" };
    const { data: pay } = await admin.from("payments").select("razorpay_payment_id").eq("order_id", orderId).eq("status", "captured").not("razorpay_payment_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pay?.razorpay_payment_id) return { ok: false, message: "No captured payment found" };
    try {
      const r = await razorpay().payments.refund(pay.razorpay_payment_id, { amount: toPaise(value), speed: "normal", notes: { order: o.order_number, note: note ?? "" } });
      refundId = r.id;
    } catch (e) {
      const msg = (e as { error?: { description?: string } })?.error?.description ?? "Razorpay refund failed";
      return { ok: false, message: msg };
    }
  }
  const refunded = Number(o.refunded_total) + value;
  await admin
    .from("orders")
    .update({ refunded_total: refunded, payment_status: refunded >= Number(o.total) ? "refunded" : "partially_refunded" })
    .eq("id", orderId);
  return { ok: true, message: `Refund of ₹${value.toLocaleString("en-IN")} initiated`, refundId };
}
