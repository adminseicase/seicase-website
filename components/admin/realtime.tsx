"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRealtime } from "@/lib/actions/admin/analytics";
import { formatINR } from "@/lib/utils";

interface RT {
  active_visitors: number;
  active_pages: { path: string; visitors: number }[];
  recent_orders: { id: string; order_number: string; customer_name: string | null; total: number; status: string; city: string | null; created_at: string; payment_method: string }[];
}

/** Live visitors + orders feed, refreshed every 15 seconds while the tab is visible. */
export function RealtimePanel() {
  const [data, setData] = useState<RT | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => document.visibilityState === "visible" && getRealtime().then((d) => alive && setData(d as RT)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const ago = (iso: string) => {
    const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
  };
  return (
    <div className="grid gap-5 md:grid-cols-[200px_1fr]">
      <div>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Active now
        </p>
        <p className="mt-1 text-4xl font-medium tabular-nums">{data?.active_visitors ?? "–"}</p>
        <p className="text-xs text-muted">visitors in the last 5 minutes</p>
        <ul className="mt-4 space-y-1 text-xs">
          {data?.active_pages.map((p) => (
            <li key={p.path} className="flex justify-between gap-2">
              <span className="truncate text-muted">{p.path}</span>
              <span>{p.visitors}</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="divide-y text-sm" aria-live="polite" aria-label="Latest orders">
        {data?.recent_orders.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 py-2">
            <Link href={`/admin/orders/${o.id}`} className="min-w-0 hover:text-cognac">
              <span className="font-medium">#{o.order_number}</span> <span className="text-muted">· {o.customer_name ?? "Guest"}{o.city ? `, ${o.city}` : ""}</span>
            </Link>
            <span className="shrink-0 text-right">
              {formatINR(o.total)} <span className="ml-1 text-xs text-muted">{ago(o.created_at)}</span>
            </span>
          </li>
        ))}
        {data && !data.recent_orders.length && <li className="py-6 text-center text-muted">No orders yet.</li>}
      </ul>
    </div>
  );
}
