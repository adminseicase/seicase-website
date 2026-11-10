"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

/**
 * The bag lives in the browser (localStorage) so it is instant and works for
 * guests. Prices here are for display only — the server re-prices everything
 * at checkout from the database.
 */
interface CartState {
  lines: CartLine[];
  couponCode: string | null;
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  replaceLines: (lines: CartLine[]) => void;
  setCoupon: (code: string | null) => void;
}

export const lineKey = (variantId: string, charmId?: string | null) => `${variantId}${charmId ? `+${charmId}` : ""}`;
export const MAX_QTY = 10;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: null,
      add: (line, quantity = 1) =>
        set((s) => {
          const key = lineKey(line.variantId, line.charm?.id);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l)),
            };
          }
          return { lines: [...s.lines, { ...line, key, quantity: Math.min(MAX_QTY, quantity) }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.key !== key)
              : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], couponCode: null }),
      replaceLines: (lines) => set({ lines }),
      setCoupon: (couponCode) => set({ couponCode }),
    }),
    { name: "seicase-cart", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const lineTotal = (l: CartLine) => (l.price + (l.charm?.price ?? 0)) * l.quantity;
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.quantity, 0);
