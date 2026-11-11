import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAbandonedCartEmail } from "@/lib/orders/abandoned";
import { adminEmail, sendEmail } from "@/lib/email/send";

export const maxDuration = 60;

/**
 * Daily job (vercel.json → crons). Also runs the database housekeeping in
 * case pg_cron isn't enabled on your Supabase plan:
 *  1. release unpaid orders older than 45 min
 *  2. mark carts abandoned after 1 hour
 *  3. email abandoned-cart reminders (once per cart, 1–72 h old)
 *  4. email a low-stock summary to the team
 *  5. refresh analytics materialized views
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  const report: Record<string, unknown> = {};

  report.released = (await admin.rpc("release_stale_pending_orders", { p_minutes: 45 })).data;
  report.abandoned = (await admin.rpc("mark_abandoned_carts", { p_minutes: 60 })).data;

  const { data: carts } = await admin
    .from("carts")
    .select("id")
    .eq("status", "abandoned")
    .is("reminder_sent_at", null)
    .not("email", "is", null)
    .gte("abandoned_at", new Date(Date.now() - 72 * 3600_000).toISOString())
    .limit(100);
  let sent = 0;
  for (const c of carts ?? []) if ((await sendAbandonedCartEmail(c.id)).ok) sent++;
  report.reminders = sent;

  const { data: notif } = await admin.from("site_settings").select("value").eq("key", "notifications").maybeSingle();
  if ((notif?.value as { low_stock_email?: boolean } | null)?.low_stock_email !== false) {
    const { data: low } = await admin
      .from("product_variants")
      .select("sku, colour_name, stock, products!inner(name, low_stock_threshold, status)")
      .eq("products.status", "published")
      .lte("stock", 10)
      .order("stock");
    const items = (low ?? [])
      .map((v) => ({ v, p: v.products as unknown as { name: string; low_stock_threshold: number } }))
      .filter(({ v, p }) => v.stock <= p.low_stock_threshold)
      .map(({ v, p }) => ({ product: p.name, colour: v.colour_name, sku: v.sku, stock: v.stock }));
    const to = await adminEmail();
    if (items.length && to)
      await sendEmail({
        to,
        subject: `Low stock: ${items.length} variant${items.length > 1 ? "s" : ""} need attention`,
        template: { kind: "low-stock", items },
      });
    report.low_stock = items.length;
  }

  await admin.rpc("refresh_analytics_views");
  await admin.rpc("purge_rate_limits");
  return NextResponse.json({ ok: true, ...report });
}
