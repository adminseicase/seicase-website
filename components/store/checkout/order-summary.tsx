"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import type { Quote } from "@/lib/actions/checkout";
import { formatINR, cn } from "@/lib/utils";

export function CouponField({ code, onApply, quote }: { code: string | null; onApply: (c: string | null) => void; quote: Quote | null }) {
  const [value, setValue] = useState("");
  const applied = quote?.coupon;
  if (code || (applied?.valid && quote?.autoApplied)) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm">
        <div>
          <p className="flex items-center gap-2 font-medium">
            <Tag className="size-4 stroke-[1.5]" aria-hidden="true" /> {applied?.code ?? code}
          </p>
          <p className={cn("mt-0.5 text-xs", applied?.valid ? "text-success" : "text-danger")} role="status">
            {applied?.message ?? "Checking…"}
          </p>
        </div>
        {code && (
          <button type="button" onClick={() => onApply(null)} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-surface-muted" aria-label="Remove code">
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onApply(value.trim().toUpperCase());
      }}
    >
      <label htmlFor="coupon" className="sr-only">
        Discount code
      </label>
      <input
        id="coupon"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Discount code"
        autoComplete="off"
        className="h-11 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm uppercase placeholder:normal-case focus:border-cognac focus:outline-none"
      />
      <button type="submit" className="h-11 rounded-md border border-foreground px-4 text-sm hover:bg-foreground hover:text-background">
        Apply
      </button>
    </form>
  );
}

export function Totals({ quote, loading, fallbackSubtotal }: { quote: Quote | null; loading: boolean; fallbackSubtotal: number }) {
  const row = (label: string, value: React.ReactNode, cls = "") => (
    <div className={cn("flex items-center justify-between", cls)}>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  return (
    <dl className={cn("space-y-2.5 text-sm transition-opacity", loading && "opacity-60")} aria-busy={loading}>
      {row("Subtotal", formatINR(subtotal))}
      {quote && quote.discount > 0 && row(`Discount${quote.coupon ? ` (${quote.coupon.code})` : ""}`, <span className="text-success">− {formatINR(quote.discount)}</span>)}
      {row("Shipping", quote ? (quote.shipping === 0 ? "FREE" : formatINR(quote.shipping)) : "Calculated at checkout")}
      {quote && quote.codFee > 0 && row("Cash on Delivery fee", formatINR(quote.codFee))}
      <div className="flex items-baseline justify-between border-t pt-3 text-base">
        <dt className="font-medium">Total</dt>
        <dd className="font-serif text-2xl">{formatINR(quote?.total ?? subtotal)}</dd>
      </div>
      {quote && quote.gst > 0 && <p className="text-right text-xs text-muted">Includes GST of {formatINR(quote.gst, { exact: true })}</p>}
    </dl>
  );
}
