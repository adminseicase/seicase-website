import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface TrackerCounts {
  low_stock: number;
  out_of_stock: number;
  orders_to_ship: number;
  delayed_orders: number;
  returns_open: number;
  reviews_pending: number;
  messages_unread: number;
  payments_failed_24h: number;
  abandoned_carts: number;
}

export async function getTrackerCounts(): Promise<TrackerCounts> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_tracker_counts");
  return (data as unknown as TrackerCounts) ?? {
    low_stock: 0,
    out_of_stock: 0,
    orders_to_ship: 0,
    delayed_orders: 0,
    returns_open: 0,
    reviews_pending: 0,
    messages_unread: 0,
    payments_failed_24h: 0,
    abandoned_carts: 0,
  };
}

/** Parses ?page=&q= style params used by every admin list. */
export function listParams(sp: Record<string, string | string[] | undefined>, pageSize = 25) {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(s("page")) || 1);
  return { page, from: (page - 1) * pageSize, to: page * pageSize - 1, pageSize, q: s("q").trim().slice(0, 80), get: s };
}

/** Escape user text for PostgREST `ilike` / `or` filters. */
export const pgLike = (q: string) => `%${q.replace(/[%_,()]/g, " ")}%`;

/** Date range from ?from=YYYY-MM-DD&to=YYYY-MM-DD (IST), defaulting to the last 30 days. */
export function dateRange(sp: Record<string, string | string[] | undefined>, defaultDays = 30) {
  const parse = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const toStr = parse(sp.to) ?? iso(today);
  const fromStr = parse(sp.from) ?? iso(new Date(today.getTime() - (defaultDays - 1) * 86_400_000));
  const from = new Date(`${fromStr}T00:00:00+05:30`);
  const to = new Date(new Date(`${toStr}T00:00:00+05:30`).getTime() + 86_400_000);
  const span = to.getTime() - from.getTime();
  return {
    fromStr,
    toStr,
    from: from.toISOString(),
    to: to.toISOString(),
    prevFrom: new Date(from.getTime() - span).toISOString(),
    prevTo: from.toISOString(),
    days: Math.round(span / 86_400_000),
  };
}
