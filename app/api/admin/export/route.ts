import { type NextRequest } from "next/server";
import Papa from "papaparse";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getReport, getSeries } from "@/lib/admin/analytics";

/**
 * CSV exports for staff: GET /api/admin/export?type=orders|products|customers|subscribers|inventory|messages|analytics
 * Uses the signed-in user's session, so Row Level Security still applies.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return new Response("Forbidden", { status: 403 });
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const supabase = await createClient();
  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case "orders": {
      const { data } = await supabase
        .from("orders")
        .select("order_number, created_at, status, payment_status, payment_method, customer_name, email, phone, subtotal, discount_total, shipping_total, cod_fee, tax_total, total, coupon_code, tracking_number, courier, shipping_address")
        .order("created_at", { ascending: false })
        .limit(10000);
      rows = (data ?? []).map(({ shipping_address, ...o }) => {
        const a = shipping_address as Record<string, string>;
        return { ...o, city: a?.city, state: a?.state, pincode: a?.pincode };
      });
      break;
    }
    case "products": {
      const { data } = await supabase
        .from("products")
        .select("name, slug, status, price, compare_at_price, cost_price, gst_rate, material, short_description, is_featured, is_trending, is_new, categories(slug), product_variants(sku, colour_name, colour_hex, stock, price_override)")
        .order("sort_order");
      rows = (data ?? []).flatMap((p) => {
        const { product_variants, categories, ...rest } = p;
        const base = { ...rest, category: (categories as unknown as { slug: string } | null)?.slug ?? "" };
        return product_variants.length ? product_variants.map((v) => ({ ...base, ...v })) : [base];
      });
      break;
    }
    case "inventory": {
      const { data } = await supabase.from("product_variants").select("sku, colour_name, stock, products(name, low_stock_threshold)").order("stock");
      rows = (data ?? []).map((v) => {
        const p = v.products as unknown as { name: string; low_stock_threshold: number };
        return { product: p?.name, colour: v.colour_name, sku: v.sku, stock: v.stock, low_stock_threshold: p?.low_stock_threshold };
      });
      break;
    }
    case "customers": {
      const { data } = await supabase.from("profiles").select("full_name, email, phone, role, is_blocked, marketing_opt_in, created_at").order("created_at", { ascending: false });
      rows = data ?? [];
      break;
    }
    case "subscribers": {
      const { data } = await supabase.from("newsletter_subscribers").select("email, source, is_active, created_at").order("created_at", { ascending: false });
      rows = data ?? [];
      break;
    }
    case "messages": {
      const { data } = await supabase.from("contact_messages").select("created_at, name, email, phone, subject, message, is_read, replied_at").order("created_at", { ascending: false });
      rows = data ?? [];
      break;
    }
    case "analytics": {
      const from = sp.get("from") ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
      const to = sp.get("to") ?? new Date().toISOString();
      const section = sp.get("section") ?? "sales";
      if (section === "sales") rows = (await getSeries(from, to, "day")) as unknown as Record<string, unknown>[];
      else {
        const rep = (await getReport(from, to)) as unknown as Record<string, unknown>;
        const v = rep[section];
        rows = Array.isArray(v) ? (v as Record<string, unknown>[]) : v ? [v as Record<string, unknown>] : [];
      }
      break;
    }
    default:
      return new Response("Unknown export type", { status: 400 });
  }

  const csv = Papa.unparse(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && typeof v === "object" ? JSON.stringify(v) : v]))));
  const name = `seicase-${type}${sp.get("section") ? `-${sp.get("section")}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
