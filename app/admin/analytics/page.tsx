import { Download } from "lucide-react";
import { getKpis, getReport, getSeries, pickGrain } from "@/lib/admin/analytics";
import { dateRange } from "@/lib/admin/queries";
import { Card, PageHeader, StatCard, Table, Td, pctChange } from "@/components/admin/ui";
import { ActionButton, DateRangePicker } from "@/components/admin/controls";
import { DonutChart, SalesChart } from "@/components/admin/lazy-charts";
import { BarList, Funnel } from "@/components/admin/bars";
import { refreshAnalytics } from "@/lib/actions/admin/analytics";
import { formatCompactINR, formatINR, formatNumber } from "@/lib/utils";

export const metadata = { title: "Analytics" };

function Export({ report, from, to }: { report: string; from: string; to: string }) {
  return (
    <a
      href={`/api/admin/export?type=analytics&section=${report}&from=${from}&to=${to}`}
      className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs"
    >
      <Download className="size-3.5" /> CSV
    </a>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const sp = await searchParams;
  const r = dateRange(sp, 30);
  const grain = (typeof sp.grain === "string" && ["day", "week", "month"].includes(sp.grain) ? sp.grain : pickGrain(r.days)) as
    "day" | "week" | "month";
  const [kpi, prev, series, prevSeries, rep] = await Promise.all([
    getKpis(r.from, r.to),
    getKpis(r.prevFrom, r.prevTo),
    getSeries(r.from, r.to, grain),
    getSeries(r.prevFrom, r.prevTo, grain),
    getReport(r.from, r.to),
  ]);
  const ex = (s: string) => <Export report={s} from={r.from} to={r.to} />;
  const grainLink = (g: string) => {
    const p = new URLSearchParams({ from: r.fromStr, to: r.toStr, grain: g });
    return (
      <a
        key={g}
        href={`?${p}`}
        className={`rounded-md px-2 py-1 text-xs capitalize ${grain === g ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
      >
        {g}
      </a>
    );
  };

  return (
    <>
      <PageHeader
        title="Analytics"
        description="First-party data from your own store — no third-party trackers required."
        actions={
          <>
            <DateRangePicker />
            <ActionButton size="sm" variant="outline" action={refreshAnalytics}>
              Refresh data
            </ActionButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Revenue" value={formatCompactINR(kpi.revenue)} delta={pctChange(kpi.revenue, prev.revenue)} />
        <StatCard label="Orders" value={formatNumber(kpi.orders)} delta={pctChange(kpi.orders, prev.orders)} />
        <StatCard label="AOV" value={formatINR(kpi.aov)} delta={pctChange(kpi.aov, prev.aov)} />
        <StatCard
          label="Conversion"
          value={`${kpi.conversion_rate.toFixed(2)}%`}
          delta={pctChange(kpi.conversion_rate, prev.conversion_rate)}
        />
        <StatCard label="Sessions" value={formatNumber(kpi.sessions)} delta={pctChange(kpi.sessions, prev.sessions)} />
        <StatCard label="Gross profit" value={formatCompactINR(kpi.gross_profit)} delta={pctChange(kpi.gross_profit, prev.gross_profit)} />
        <StatCard label="Units sold" value={formatNumber(kpi.units)} delta={pctChange(kpi.units, prev.units)} />
        <StatCard label="New customers" value={formatNumber(kpi.new_customers)} delta={pctChange(kpi.new_customers, prev.new_customers)} />
        <StatCard
          label="Returning customers"
          value={formatNumber(kpi.returning_customers)}
          delta={pctChange(kpi.returning_customers, prev.returning_customers)}
        />
        <StatCard
          label="Repeat purchase rate"
          value={`${rep.repeat.repeat_rate}%`}
          hint={`${rep.repeat.repeat_customers} of ${rep.repeat.customers}`}
        />
        <StatCard label="Refund rate" value={`${kpi.refund_rate.toFixed(1)}%`} />
        <StatCard
          label="Discounts given"
          value={formatCompactINR(kpi.discount_total)}
          delta={pctChange(kpi.discount_total, prev.discount_total)}
        />
      </div>

      <Card
        className="mt-6"
        title="Sales over time"
        actions={
          <div className="flex items-center gap-1">
            {["day", "week", "month"].map(grainLink)} {ex("sales")}
          </div>
        }
      >
        <SalesChart data={series} compare={prevSeries} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Conversion funnel" actions={ex("funnel")}>
          <Funnel steps={rep.funnel} />
        </Card>
        <Card title="Traffic sources" actions={ex("sources")}>
          <BarList hue="aqua" rows={rep.sources.map((s) => ({ label: s.source, value: s.sessions }))} />
        </Card>
      </div>

      <Card className="mt-6" title="Top products" actions={ex("top_products")}>
        <Table head={["Product", "Units", "Revenue", "Views", "View → purchase"]} empty="No product activity in this period.">
          {rep.top_products.map((p) => (
            <tr key={p.id}>
              <Td>{p.name}</Td>
              <Td className="tabular-nums">{p.units}</Td>
              <Td className="tabular-nums">{formatINR(p.revenue)}</Td>
              <Td className="tabular-nums">{formatNumber(p.views)}</Td>
              <Td className="tabular-nums">{p.view_to_purchase}%</Td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Categories" actions={ex("categories")}>
          <BarList hue="orange" money rows={rep.categories.map((c) => ({ label: c.name, value: c.revenue, sub: `${c.units} units` }))} />
        </Card>
        <Card title="Colours" actions={ex("colours")}>
          <BarList
            hue="violet"
            money
            rows={rep.colours.map((c) => ({ label: c.name, value: c.revenue, color: c.hex, sub: `${c.units}` }))}
          />
        </Card>
        <Card title="Devices" actions={ex("devices")}>
          <DonutChart label="Sessions by device" data={rep.devices.map((d) => ({ name: d.device, value: d.sessions }))} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Top cities (visitors)" actions={ex("cities")}>
          <BarList
            hue="magenta"
            rows={rep.cities.map((c) => ({ label: `${c.city}${c.region ? `, ${c.region}` : ""}`, value: c.sessions }))}
            empty="City data appears once you're live on Vercel."
          />
        </Card>
        <Card title="Top states (orders)" actions={ex("states")}>
          <BarList
            hue="green"
            rows={rep.states.map((s) => ({ label: s.state ?? "Unknown", value: s.orders, sub: formatCompactINR(s.revenue) }))}
          />
        </Card>
        <Card title="UTM campaigns" actions={ex("campaigns")}>
          <BarList
            hue="yellow"
            rows={rep.campaigns.map((c) => ({
              label: `${c.campaign} (${c.source ?? "—"}/${c.medium ?? "—"})`,
              value: c.sessions,
              sub: `${c.orders} orders · ${formatCompactINR(c.revenue)}`,
            }))}
            empty="Tag links with ?utm_campaign= to see campaigns here."
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Top searches" actions={ex("searches")}>
          <BarList hue="blue" rows={rep.searches.map((s) => ({ label: s.term, value: s.count, sub: `~${s.avg_results} results` }))} />
        </Card>
        <Card title="Searches with no results" actions={ex("zero_result_searches")}>
          <BarList
            hue="red"
            rows={rep.zero_result_searches.map((s) => ({ label: s.term, value: s.count }))}
            empty="Every search found something."
          />
          <p className="text-muted mt-3 text-xs">Tip: these are products or words customers expect — consider adding them.</p>
        </Card>
        <Card title="Most wishlisted" actions={ex("wishlisted")}>
          <BarList
            hue="magenta"
            rows={rep.wishlisted.map((w) => ({ label: w.name, value: w.saved, sub: `+${w.added_in_period} this period` }))}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Abandoned carts">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Abandoned</dt>
              <dd className="text-2xl">{rep.abandoned.count}</dd>
            </div>
            <div>
              <dt className="text-muted">Value</dt>
              <dd className="text-2xl">{formatCompactINR(rep.abandoned.value)}</dd>
            </div>
            <div>
              <dt className="text-muted">Recovered</dt>
              <dd className="text-2xl">{rep.abandoned.recovered}</dd>
            </div>
            <div>
              <dt className="text-muted">Recovery rate</dt>
              <dd className="text-2xl">{rep.abandoned.recovery_rate}%</dd>
            </div>
          </dl>
          <a href="/admin/abandoned-carts" className="text-muted hover:text-foreground mt-4 inline-block text-xs">
            Follow up →
          </a>
        </Card>
        <Card title="Coupon usage" actions={ex("coupons")} className="lg:col-span-2">
          <Table head={["Code", "Uses", "Discount cost", "Revenue"]} empty="No coupons used in this period.">
            {rep.coupons.map((c) => (
              <tr key={c.code}>
                <Td className="font-medium">{c.code}</Td>
                <Td>{c.uses}</Td>
                <Td>{formatINR(c.discount)}</Td>
                <Td>{formatINR(c.revenue)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card className="mt-6" title="Customer cohorts (customers who ordered again, by months after first order)" actions={ex("cohorts")}>
        <Table
          head={["First order", "Customers", "+1 month", "+2 months", "+3 months", "+4–6 months"]}
          empty="Cohorts build up as customers return."
        >
          {rep.cohorts.map((c) => {
            const pct = (n: number) => (c.customers ? `${n} (${Math.round((n / c.customers) * 100)}%)` : "0");
            return (
              <tr key={c.cohort}>
                <Td className="font-medium">{c.cohort}</Td>
                <Td>{c.customers}</Td>
                <Td>{pct(c.m1)}</Td>
                <Td>{pct(c.m2)}</Td>
                <Td>{pct(c.m3)}</Td>
                <Td>{pct(c.m4_6)}</Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
