"use client";

import { useEffect, useRef, useState } from "react";
import { quoteCheckout, type Quote } from "@/lib/actions/checkout";
import type { CartLine } from "@/lib/types";

/** Debounced server quote (prices, coupon, shipping, totals) for the current bag. */
export function useQuote(
  lines: CartLine[],
  opts: { couponCode: string | null; email?: string | null; paymentMethod?: "razorpay" | "cod"; enabled?: boolean },
) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const key = JSON.stringify([lines.map((l) => [l.variantId, l.quantity, l.charm?.id]), opts.couponCode, opts.email, opts.paymentMethod]);

  useEffect(() => {
    if (opts.enabled === false) return;
    if (!lines.length) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const q = await quoteCheckout({
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, charmId: l.charm?.id ?? null })),
          couponCode: opts.couponCode,
          email: opts.email ?? null,
          paymentMethod: opts.paymentMethod,
        });
        if (id === seq.current) setQuote(q);
      } catch {
        /* keep the last quote */
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every input
  }, [key, opts.enabled]);

  // An empty bag never shows a stale quote
  return { quote: lines.length ? quote : null, loading: lines.length ? loading : false };
}
