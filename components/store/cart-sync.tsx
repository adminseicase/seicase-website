"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/store/cart";
import { getSessionId } from "@/lib/analytics/client";
import { syncServerCart } from "@/lib/actions/cart";

export const CHECKOUT_EMAIL_KEY = "sc_checkout_email";

/**
 * Mirrors the bag to the server (debounced) so abandoned carts can be
 * recovered. Skips the network entirely for anonymous shoppers who haven't
 * signed in or given an email.
 */
export function CartSync() {
  const lines = useCart((s) => s.lines);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      let email: string | null = null;
      try {
        email = localStorage.getItem(CHECKOUT_EMAIL_KEY);
      } catch {}
      const signedIn = document.cookie.includes("-auth-token");
      if (!email && !signedIn) return;
      syncServerCart({
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, charmId: l.charm?.id ?? null })),
        sessionId: getSessionId(),
        email,
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [lines]);
  return null;
}
