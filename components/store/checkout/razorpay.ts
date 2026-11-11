"use client";

import { getSessionId, track } from "@/lib/analytics/client";
import { reportPaymentFailure, verifyPayment } from "@/lib/actions/checkout";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (
    event: "payment.failed",
    cb: (r: { error: { code: string; description: string; metadata?: { payment_id?: string } } }) => void,
  ) => void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;
/** Loads checkout.js only when the shopper actually pays. */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export async function openRazorpay(opts: {
  orderId: string;
  accessToken: string;
  orderNumber: string;
  razorpay: { keyId: string; orderId: string; amount: number; name: string; email: string; contact: string };
  onSuccess: (redirect: string) => void;
  onError: (message: string) => void;
  onDismiss: () => void;
}) {
  await loadRazorpay();
  const sessionId = getSessionId();
  track("payment_initiated", { order_id: opts.orderId, value: opts.razorpay.amount / 100 });
  const rzp = new window.Razorpay!({
    key: opts.razorpay.keyId,
    amount: opts.razorpay.amount,
    currency: "INR",
    name: "seicase",
    description: `Order #${opts.orderNumber}`,
    order_id: opts.razorpay.orderId,
    prefill: { name: opts.razorpay.name, email: opts.razorpay.email, contact: opts.razorpay.contact },
    notes: { order_number: opts.orderNumber },
    theme: { color: "#1F1A17" },
    modal: { ondismiss: opts.onDismiss, confirm_close: true },
    handler: async (r: RazorpayResponse) => {
      const res = await verifyPayment({ orderId: opts.orderId, accessToken: opts.accessToken, ...r, sessionId });
      if (res.ok && res.redirect) opts.onSuccess(res.redirect);
      else opts.onError(res.message ?? "Payment verification failed.");
    },
  });
  rzp.on("payment.failed", (r) => {
    reportPaymentFailure({
      orderId: opts.orderId,
      accessToken: opts.accessToken,
      code: r.error.code,
      description: r.error.description,
      paymentId: r.error.metadata?.payment_id,
      sessionId,
    }).catch(() => {});
  });
  rzp.open();
}
