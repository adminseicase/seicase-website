import { formatINR, formatNumber } from "@/lib/utils";
import { FUNNEL_RAMP, SERIES, type SeriesHue } from "@/lib/admin/palette";

/** Horizontal bar list (server-rendered, no JS). One measure per list, so the whole
 *  list wears one hue; give each card its own `hue` so cards are easy to tell apart. */
export function BarList({
  rows,
  money = false,
  empty = "No data for this period yet.",
  hue = "blue",
}: {
  rows: { label: string; value: number; sub?: string; color?: string }[];
  money?: boolean;
  empty?: string;
  hue?: SeriesHue;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-muted py-6 text-center text-sm">{empty}</p>;
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
              {r.sub && <span className="text-muted ml-2 text-xs">{r.sub}</span>}
            </span>
          </div>
          <div className="bg-surface-muted h-2 overflow-hidden rounded-full">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: SERIES[hue] }} />
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
                {formatNumber(s.sessions)} {i > 0 && <span className="text-muted text-xs">({conv.toFixed(1)}% of previous)</span>}
              </span>
            </div>
            <div className="bg-surface-muted h-7 overflow-hidden rounded-md">
              <div
                className="h-full rounded-md"
                style={{
                  width: `${Math.max(2, (s.sessions / top) * 100)}%`,
                  background: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)],
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
