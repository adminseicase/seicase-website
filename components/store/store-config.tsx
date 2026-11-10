"use client";

import { createContext, useContext } from "react";

export interface StoreConfig {
  freeShippingThreshold: number;
  flatRate: number;
  codEnabled: boolean;
  codFee: number;
  codMaxOrder: number;
  returnWindowDays: number;
  metroDays: string;
  standardDays: string;
  supportEmail: string;
  supportPhone: string;
  razorpayKeyId: string;
  supabaseEnabled: boolean;
  turnstileSiteKey: string;
}

const Ctx = createContext<StoreConfig | null>(null);

/** Public store settings for client components (shipping rules, contact details). */
export function StoreConfigProvider({ value, children }: { value: StoreConfig; children: React.ReactNode }) {
  return <Ctx value={value}>{children}</Ctx>;
}

export function useStoreConfig() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStoreConfig must be used inside StoreConfigProvider");
  return v;
}
