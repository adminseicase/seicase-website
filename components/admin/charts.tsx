"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactINR, formatINR } from "@/lib/utils";
import { CHART_GRID, NEUTRAL, SERIES, SERIES_ORDER } from "@/lib/admin/palette";

const C = { ink: SERIES.blue, previous: NEUTRAL, grid: CHART_GRID };
/** Slot colour in fixed order; anything past 8 slices is grey ("Other"), never a re-used hue. */
const slot = (i: number) => SERIES_ORDER[i] ?? NEUTRAL;

export function SalesChart({
  data,
  compare,
}: {
  data: { date: string; revenue: number; orders: number }[];
  compare?: { date: string; revenue: number }[];
}) {
  const merged = data.map((d, i) => ({
    ...d,
    previous: compare?.[i]?.revenue ?? null,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));
  return (
    <div className="w-full">
      {compare && (
        <ul className="text-muted mb-2 flex gap-4 text-xs">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded" style={{ background: C.ink }} /> This period
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed" style={{ borderColor: C.previous }} /> Previous period
          </li>
        </ul>
      )}
      <div className="h-72 w-full" role="img" aria-label="Revenue over time">
        <ResponsiveContainer>
          <AreaChart data={merged} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={C.ink} stopOpacity={0.25} />
                <stop offset="1" stopColor={C.ink} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v) => formatCompactINR(Number(v))}
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              formatter={(v, name) => [
                name === "orders" ? v : formatINR(Number(v)),
                name === "revenue" ? "Revenue" : name === "previous" ? "Previous period" : "Orders",
              ]}
            />
            {compare && (
              <Area type="monotone" dataKey="previous" stroke={C.previous} strokeDasharray="4 4" fill="none" strokeWidth={2} dot={false} />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={C.ink}
              fill="url(#rev)"
              strokeWidth={2}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DonutChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex items-center gap-6">
      <div className="h-40 w-40 shrink-0" role="img" aria-label={label}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} stroke="var(--surface)" strokeWidth={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={slot(i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: slot(i) }} />
            <span className="capitalize">{d.name}</span>
            <span className="text-muted">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
