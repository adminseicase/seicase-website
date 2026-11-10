"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/store/cart";

/** Empties the bag once the confirmation page is shown. */
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
