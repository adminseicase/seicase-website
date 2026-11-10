"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import type { CartLine } from "@/lib/types";

interface UiState {
  miniCartOpen: boolean;
  lastAdded: CartLine | null;
  searchOpen: boolean;
  menuOpen: boolean;
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
  openMiniCart: (line = null) => set({ miniCartOpen: true, lastAdded: line }),
  setMiniCart: (miniCartOpen) => set({ miniCartOpen }),
  setSearch: (searchOpen) => set({ searchOpen }),
  setMenu: (menuOpen) => set({ menuOpen }),
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
