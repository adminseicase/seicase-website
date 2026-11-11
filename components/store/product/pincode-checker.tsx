"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

interface Estimate {
  ok: boolean;
  message: string;
  city?: string;
  cod?: boolean;
}

/** "Check delivery" — validates the pincode and estimates delivery days. */
export function PincodeChecker() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Estimate | null>(null);

  return (
    <div className="mt-6">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^[1-9]\d{5}$/.test(pin)) {
            setRes({ ok: false, message: "Please enter a valid 6-digit pincode." });
            return;
          }
          setLoading(true);
          try {
            const r = await fetch(`/api/pincode?pin=${pin}`);
            setRes(await r.json());
          } catch {
            setRes({ ok: false, message: "Couldn't check right now. Please try again." });
          } finally {
            setLoading(false);
          }
        }}
      >
        <label htmlFor="pincode" className="sr-only">
          Delivery pincode
        </label>
        <div className="border-border-strong bg-surface focus-within:border-cognac flex h-11 flex-1 items-center gap-2 rounded-md border px-3">
          <MapPin className="text-muted size-4 shrink-0 stroke-[1.5]" aria-hidden="true" />
          <input
            id="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter pincode for delivery date"
            className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="border-foreground hover:bg-foreground hover:text-background h-11 rounded-md border px-4 text-sm"
          disabled={loading}
        >
          {loading ? "…" : "Check"}
        </button>
      </form>
      {res && (
        <p className={`mt-2 text-sm ${res.ok ? "text-success" : "text-danger"}`} role="status">
          {res.message}
          {res.ok && res.cod !== undefined && (
            <span className="text-muted"> · {res.cod ? "Cash on Delivery available" : "Prepaid only"}</span>
          )}
        </p>
      )}
    </div>
  );
}
