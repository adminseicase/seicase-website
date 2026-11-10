import { formatINR, formatNumber } from "@/lib/utils";

/** Horizontal bar list (server-rendered, no JS). */
export function BarList({ rows, money = false, empty = "No data for this period yet." }: { rows: { label: string; value: number; sub?: string; color?: string }[]; money?: boolean; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 truncate">
              {r.color && <span className="size-2.5 shrink-0 rounded-full border border-black/10" style={{ background: r.color }} />}
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {money ? formatINR(r.value) : formatNumber(r.value)}
              {r.sub && <span className="ml-2 text-xs text-muted">{r.sub}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-cognac" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Funnel({ steps }: { steps: { step: string; sessions: number }[] }) {
  const top = Math.max(1, steps[0]?.sessions ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].sessions : s.sessions;
        const conv = prev ? (s.sessions / prev) * 100 : 0;
        return (
          <li key={s.step}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{s.step}</span>
              <span className="tabular-nums">
                {formatNumber(s.sessions)} {i > 0 && <span className="text-xs text-muted">({conv.toFixed(1)}% of previous)</span>}
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-md bg-surface-muted">
              <div className="h-full rounded-md bg-gradient-to-r from-brown to-cognac" style={{ width: `${Math.max(2, (s.sessions / top) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
