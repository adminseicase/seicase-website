"use client";

import { Truck } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { useStoreConfig } from "./store-config";

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { freeShippingThreshold } = useStoreConfig();
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const pct = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  return (
    <div className="bg-surface-muted/70 rounded-lg p-3">
      <p className="mb-2 flex items-center gap-2 text-sm">
        <Truck className="text-cognac size-4 stroke-[1.5]" aria-hidden="true" />
        {remaining > 0 ? (
          <span>
            Add <strong className="font-medium">{formatINR(remaining)}</strong> more for free shipping
          </span>
        ) : (
          <span>You&apos;ve unlocked free shipping</span>
        )}
      </p>
      <div
        className="bg-border h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Progress towards free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="bg-cognac h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
