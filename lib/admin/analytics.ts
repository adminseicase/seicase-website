import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Kpis {
  revenue: number;
  orders: number;
  units: number;
  aov: number;
  sessions: number;
  visitors: number;
  conversion_rate: number;
  new_customers: number;
  returning_customers: number;
  refund_rate: number;
  gross_profit: number;
  discount_total: number;
}
export interface SeriesPoint {
  date: string;
  orders: number;
  revenue: number;
  profit: number;
}
export interface Report {
  funnel: { step: string; sessions: number }[];
  top_products: { id: string; name: string; slug: string; units: number; revenue: number; views: number; view_to_purchase: number }[];
  categories: { name: string; units: number; revenue: number }[];
  colours: { name: string; hex: string; units: number; revenue: number }[];
  sources: { source: string; sessions: number }[];
  campaigns: { campaign: string; source: string; medium: string; sessions: number; orders: number; revenue: number }[];
  devices: { device: string; sessions: number }[];
  cities: { city: string; region: string; sessions: number }[];
  states: { state: string; orders: number; revenue: number }[];
  searches: { term: string; count: number; avg_results: number }[];
  zero_result_searches: { term: string; count: number }[];
  wishlisted: { id: string; name: string; slug: string; saved: number; added_in_period: number }[];
  abandoned: { count: number; value: number; recovered: number; recovered_value: number; recovery_rate: number };
  coupons: { code: string; uses: number; discount: number; revenue: number }[];
  repeat: { customers: number; repeat_customers: number; repeat_rate: number };
  cohorts: { cohort: string; customers: number; m1: number; m2: number; m3: number; m4_6: number }[];
}

const num = <T extends object>(o: T): T =>
  JSON.parse(JSON.stringify(o), (_, v) => (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v));

export async function getKpis(from: string, to: string): Promise<Kpis> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("analytics_kpis", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return num(data as unknown as Kpis);
}

export async function getSeries(from: string, to: string, grain: "day" | "week" | "month"): Promise<SeriesPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("analytics_sales_series", { p_from: from, p_to: to, p_grain: grain });
  if (error) throw new Error(error.message);
  return num((data as unknown as SeriesPoint[]) ?? []);
}

export async function getReport(from: string, to: string): Promise<Report> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("analytics_report", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return num(data as unknown as Report);
}

export function pickGrain(days: number): "day" | "week" | "month" {
  return days <= 45 ? "day" : days <= 180 ? "week" : "month";
}
