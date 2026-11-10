import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { serverEnv } from "@/lib/server-env";

let instance: Razorpay | null = null;

export function razorpay() {
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !serverEnv.razorpayKeySecret) {
    throw new Error("Razorpay keys are not configured. See docs/SETUP.md → Razorpay.");
  }
  instance ??= new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: serverEnv.razorpayKeySecret });
  return instance;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret) */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", serverEnv.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook_secret) */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !serverEnv.razorpayWebhookSecret) return false;
  const expected = createHmac("sha256", serverEnv.razorpayWebhookSecret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
