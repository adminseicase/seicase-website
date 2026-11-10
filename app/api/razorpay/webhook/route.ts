import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { onOrderPlaced } from "@/lib/orders/notify";
import type { Json } from "@/lib/supabase/database.types";

interface RzpPayment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
  notes?: { order_id?: string };
}
interface RzpEvent {
  event: string;
  payload: {
    payment?: { entity: RzpPayment };
    order?: { entity: { id: string; notes?: { order_id?: string } } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
  };
}

/**
 * POST /api/razorpay/webhook
 * Configure in Razorpay Dashboard → Settings → Webhooks with events:
 * payment.captured, payment.failed, order.paid, refund.processed.
 * Every call is logged to payment_webhook_logs (Admin → Payments).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");
  const valid = verifyWebhookSignature(raw, signature);
  const admin = createAdminClient();

  let body: RzpEvent | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    /* logged below */
  }

  const { data: log } = await admin
    .from("payment_webhook_logs")
    .upsert(
      { event: body?.event ?? "unparseable", razorpay_event_id: eventId, signature_valid: valid, payload: (body as unknown as Json) ?? null },
      { onConflict: "razorpay_event_id", ignoreDuplicates: false },
    )
    .select("id, processed")
    .single();

  if (!valid || !body) return NextResponse.json({ ok: false }, { status: 400 });
  if (log?.processed) return NextResponse.json({ ok: true, duplicate: true });

  let error: string | null = null;
  try {
    const payment = body.payload.payment?.entity;
    if ((body.event === "payment.captured" || body.event === "order.paid") && payment) {
      const { data: order } = await admin.from("orders").select("id, payment_status").eq("razorpay_order_id", payment.order_id).maybeSingle();
      if (order && order.payment_status !== "paid") {
        const { error: e } = await admin.rpc("mark_order_paid", {
          p_order_id: order.id,
          p_razorpay_order_id: payment.order_id,
          p_razorpay_payment_id: payment.id,
          p_signature: "webhook",
          p_amount_paise: payment.amount,
          p_method: payment.method ?? "razorpay",
          p_raw: payment as unknown as Json,
        });
        if (e) error = e.message;
        else after(() => onOrderPlaced(order.id));
      }
    } else if (body.event === "payment.failed" && payment) {
      const { data: order } = await admin.from("orders").select("id, total").eq("razorpay_order_id", payment.order_id).maybeSingle();
      await admin.from("payments").upsert(
        {
          order_id: order?.id ?? null,
          razorpay_order_id: payment.order_id,
          razorpay_payment_id: payment.id,
          amount: payment.amount / 100,
          status: "failed",
          method: payment.method ?? null,
          error_code: payment.error_code ?? null,
          error_description: payment.error_description ?? null,
          raw: payment as unknown as Json,
        },
        { onConflict: "razorpay_payment_id" },
      );
    } else if (body.event === "refund.processed" && body.payload.refund) {
      const r = body.payload.refund.entity;
      const { data: p } = await admin.from("payments").select("order_id").eq("razorpay_payment_id", r.payment_id).maybeSingle();
      if (p?.order_id) {
        const { data: o } = await admin.from("orders").select("total, refunded_total").eq("id", p.order_id).single();
        if (o) {
          const refunded = Math.min(Number(o.total), Number(o.refunded_total) + r.amount / 100);
          await admin
            .from("orders")
            .update({ refunded_total: refunded, payment_status: refunded >= Number(o.total) ? "refunded" : "partially_refunded" })
            .eq("id", p.order_id);
        }
        await admin.from("payments").update({ status: "refunded" }).eq("razorpay_payment_id", r.payment_id);
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown";
  }

  if (log?.id) await admin.from("payment_webhook_logs").update({ processed: !error, error }).eq("id", log.id);
  return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
}
