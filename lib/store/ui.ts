"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import type { CartLine } from "@/lib/types";

interface UiState {
  miniCartOpen: boolean;
  lastAdded: CartLine | null;
  searchOpen: boolean;
  menuOpen: boolean;
  /** lazily-loaded drawers stay mounted once opened */
  mounted: { search: boolean; cart: boolean; menu: boolean };
  openMiniCart: (line?: CartLine | null) => void;
  setMiniCart: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  setMenu: (open: boolean) => void;
}

export const useUi = create<UiState>()((set) => ({
  miniCartOpen: false,
  lastAdded: null,
  searchOpen: false,
  menuOpen: false,
  mounted: { search: false, cart: false, menu: false },
  openMiniCart: (line = null) => set((s) => ({ miniCartOpen: true, lastAdded: line, mounted: { ...s.mounted, cart: true } })),
  setMiniCart: (miniCartOpen) => set((s) => ({ miniCartOpen, mounted: { ...s.mounted, cart: s.mounted.cart || miniCartOpen } })),
  setSearch: (searchOpen) => set((s) => ({ searchOpen, mounted: { ...s.mounted, search: s.mounted.search || searchOpen } })),
  setMenu: (menuOpen) => set((s) => ({ menuOpen, mounted: { ...s.mounted, menu: s.mounted.menu || menuOpen } })),
}));

const subscribe = () => () => {};
/** False during SSR/hydration, true afterwards — use before reading persisted stores. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
