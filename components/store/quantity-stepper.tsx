"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_QTY } from "@/lib/store/cart";

export function QuantityStepper({
  value,
  onChange,
  max = MAX_QTY,
  label = "Quantity",
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const btn = cn(
    "inline-flex items-center justify-center text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40",
    size === "sm" ? "size-9" : "size-11",
  );
  return (
    <div className="border-border-strong bg-surface inline-flex items-center rounded-md border" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="Decrease quantity" onClick={() => onChange(value - 1)} disabled={value <= 1}>
        <Minus className="size-3.5 stroke-[1.5]" />
      </button>
      <span className={cn("min-w-8 text-center text-sm tabular-nums", size === "sm" ? "w-8" : "w-10")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="Increase quantity" onClick={() => onChange(value + 1)} disabled={value >= max}>
        <Plus className="size-3.5 stroke-[1.5]" />
      </button>
    </div>
  );
}
