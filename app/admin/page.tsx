import Link from "next/link";
import { AlertCircle, ArrowRight, Boxes, Inbox, ShoppingBag, Star, Undo2, Wallet } from "lucide-react";
import { getKpis, getReport, getSeries, pickGrain } from "@/lib/admin/analytics";
import { dateRange, getTrackerCounts } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatCard, pctChange } from "@/components/admin/ui";
import { DateRangePicker } from "@/components/admin/controls";
import { SalesChart, RealtimePanel } from "@/components/admin/lazy-charts";
import { BarList, Funnel } from "@/components/admin/bars";
import { StatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, formatCompactINR, formatDate, formatINR, formatNumber } from "@/lib/utils";
import { SERIES_ORDER } from "@/lib/admin/palette";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const r = dateRange(sp, 30);
  const supabase = await createClient();
  const [kpi, prev, series, prevSeries, report, counts, lowStock, recent] = await Promise.all([
    getKpis(r.from, r.to),
    getKpis(r.prevFrom, r.prevTo),
    getSeries(r.from, r.to, pickGrain(r.days)),
    getSeries(r.prevFrom, r.prevTo, pickGrain(r.days)),
    getReport(r.from, r.to),
    getTrackerCounts(),
    supabase
      .from("product_variants")
      .select("id, sku, colour_name, stock, products!inner(name, low_stock_threshold, status)")
      .lte("stock", 5)
      .neq("products.status", "archived")
      .order("stock")
      .limit(6),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, status, created_at")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const trackers = [
    {
      href: "/admin/orders?status=placed",
      label: "Orders to ship",
      n: counts.orders_to_ship,
      Icon: ShoppingBag,
      warn: counts.delayed_orders ? `${counts.delayed_orders} delayed` : null,
    },
    {
      href: "/admin/inventory?filter=low",
      label: "Low / out of stock",
      n: counts.low_stock + counts.out_of_stock,
      Icon: Boxes,
      warn: counts.out_of_stock ? `${counts.out_of_stock} out` : null,
    },
    { href: "/admin/returns", label: "Open returns", n: counts.returns_open, Icon: Undo2 },
    { href: "/admin/payments?status=failed", label: "Failed payments (24h)", n: counts.payments_failed_24h, Icon: Wallet },
    { href: "/admin/reviews?status=pending", label: "Reviews to moderate", n: counts.reviews_pending, Icon: Star },
    { href: "/admin/messages", label: "Unread messages", n: counts.messages_unread, Icon: Inbox },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatDate(r.from)} – ${formatDate(new Date(Date.parse(r.to) - 1))} · compared with the previous ${r.days} days`}
        actions={<DateRangePicker />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Revenue" value={formatCompactINR(kpi.revenue)} delta={pctChange(kpi.revenue, prev.revenue)} />
        <StatCard label="Orders" value={formatNumber(kpi.orders)} delta={pctChange(kpi.orders, prev.orders)} />
        <StatCard label="Average order value" value={formatINR(kpi.aov)} delta={pctChange(kpi.aov, prev.aov)} />
        <StatCard
          label="Conversion rate"
          value={`${kpi.conversion_rate.toFixed(2)}%`}
          delta={pctChange(kpi.conversion_rate, prev.conversion_rate)}
          hint={`${formatNumber(kpi.sessions)} sessions`}
        />
        <StatCard label="Visitors" value={formatNumber(kpi.visitors)} delta={pctChange(kpi.visitors, prev.visitors)} />
        <StatCard label="New / returning customers" value={`${kpi.new_customers} / ${kpi.returning_customers}`} />
        <StatCard
          label="Gross profit"
          value={formatCompactINR(kpi.gross_profit)}
          delta={pctChange(kpi.gross_profit, prev.gross_profit)}
          hint={kpi.revenue ? `${((kpi.gross_profit / kpi.revenue) * 100).toFixed(0)}% margin` : undefined}
        />
        <StatCard label="Refund rate" value={`${kpi.refund_rate.toFixed(1)}%`} delta={pctChange(kpi.refund_rate, prev.refund_rate) * -1} />
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {trackers.map(({ href, label, n, Icon, warn }, i) => (
          <li key={label}>
            <Link href={href} className="bg-surface hover:border-foreground flex h-full flex-col rounded-xl border p-4">
              <Icon className="size-5 stroke-[1.5]" style={{ color: SERIES_ORDER[i] }} aria-hidden="true" />
              <p className="mt-3 text-2xl font-medium tabular-nums">{n}</p>
              <p className="text-muted text-xs">{label}</p>
              {warn && (
                <p className="text-danger mt-1 flex items-center gap-1 text-xs">
                  <AlertCircle className="size-3" /> {warn}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card
          title="Sales over time"
          actions={
            <Link href="/admin/analytics" className="text-muted hover:text-foreground text-xs">
              Full report →
            </Link>
          }
        >
          <SalesChart data={series} compare={prevSeries} />
        </Card>
        <Card title="Conversion funnel">
          <Funnel steps={report.funnel} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Top products">
          <BarList
            hue="blue"
            money
            rows={report.top_products.slice(0, 6).map((p) => ({ label: p.name, value: p.revenue, sub: `${p.units} sold` }))}
          />
        </Card>
        <Card
          title="Low stock"
          actions={
            <Link href="/admin/inventory?filter=low" className="text-muted hover:text-foreground text-xs">
              Inventory →
            </Link>
          }
        >
          <ul className="divide-y text-sm">
            {(lowStock.data ?? []).map((v) => {
              const p = v.products as unknown as { name: string };
              return (
                <li key={v.id} className="flex justify-between py-2">
                  <span className="truncate">
                    {p.name} <span className="text-muted">· {v.colour_name}</span>
                  </span>
                  <span className={v.stock === 0 ? "text-danger" : "text-warning"}>{v.stock === 0 ? "Out" : `${v.stock} left`}</span>
                </li>
              );
            })}
            {!lowStock.data?.length && <li className="text-muted py-6 text-center">All stocked up.</li>}
          </ul>
        </Card>
        <Card
          title="Recent orders"
          actions={
            <Link href="/admin/orders" className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs">
              All <ArrowRight className="size-3" />
            </Link>
          }
        >
          <ul className="divide-y text-sm">
            {(recent.data ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/orders/${o.id}`} className="hover:text-cognac truncate">
                  #{o.order_number} <span className="text-muted">{o.customer_name}</span>
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  {formatINR(o.total)} <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Real-time" className="mt-6">
        <RealtimePanel />
      </Card>
    </>
  );
}
