"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  variantId?: string | null;
  addedAt: number;
}

interface WishlistState {
  items: WishlistItem[];
  has: (productId: string) => boolean;
  toggle: (item: Omit<WishlistItem, "addedAt">) => boolean; // returns true if now saved
  remove: (productId: string) => void;
  merge: (items: WishlistItem[]) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (productId) => get().items.some((i) => i.productId === productId),
      toggle: (item) => {
        const exists = get().items.some((i) => i.productId === item.productId);
        set((s) => ({
          items: exists ? s.items.filter((i) => i.productId !== item.productId) : [{ ...item, addedAt: Date.now() }, ...s.items],
        }));
        return !exists;
      },
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      merge: (incoming) =>
        set((s) => {
          const map = new Map(s.items.map((i) => [i.productId, i]));
          for (const i of incoming) if (!map.has(i.productId)) map.set(i.productId, i);
          return { items: [...map.values()].sort((a, b) => b.addedAt - a.addedAt) };
        }),
    }),
    { name: "seicase-wishlist", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
