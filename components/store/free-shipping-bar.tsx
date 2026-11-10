"use client";

import { Truck } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { useStoreConfig } from "./store-config";

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { freeShippingThreshold } = useStoreConfig();
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const pct = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  return (
    <div className="rounded-lg bg-surface-muted/70 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm">
        <Truck className="size-4 stroke-[1.5] text-cognac" aria-hidden="true" />
        {remaining > 0 ? (
          <span>
            Add <strong className="font-medium">{formatINR(remaining)}</strong> more for free shipping
          </span>
        ) : (
          <span>You&apos;ve unlocked free shipping</span>
        )}
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Progress towards free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="h-full rounded-full bg-cognac transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
