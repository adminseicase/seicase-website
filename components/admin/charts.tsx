"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactINR, formatINR } from "@/lib/utils";

const C = { ink: "#9C5A33", soft: "#D9B89C", grid: "rgba(125,110,100,0.18)", olive: "#5F5D3B", burgundy: "#6D2430", brown: "#3F2618", tan: "#C9A86A" };
const PIE = [C.ink, C.olive, C.burgundy, C.tan, C.brown, "#8B7D72"];

export function SalesChart({ data, compare }: { data: { date: string; revenue: number; orders: number }[]; compare?: { date: string; revenue: number }[] }) {
  const merged = data.map((d, i) => ({ ...d, previous: compare?.[i]?.revenue ?? null, label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Revenue over time">
      <ResponsiveContainer>
        <AreaChart data={merged} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.ink} stopOpacity={0.3} />
              <stop offset="1" stopColor={C.ink} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v) => formatCompactINR(Number(v))} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }}
            formatter={(v, name) => [name === "orders" ? v : formatINR(Number(v)), name === "revenue" ? "Revenue" : name === "previous" ? "Previous period" : "Orders"]}
          />
          {compare && <Area type="monotone" dataKey="previous" stroke={C.soft} strokeDasharray="4 4" fill="none" strokeWidth={1.5} />}
          <Area type="monotone" dataKey="revenue" stroke={C.ink} fill="url(#rev)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
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
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={PIE[i % PIE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />
            <span className="capitalize">{d.name}</span>
            <span className="text-muted">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
