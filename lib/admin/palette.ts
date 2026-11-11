/**
 * Admin data colours. One place, so every chart, bar and stat tile agrees.
 *
 * SERIES is an 8-hue categorical palette, validated (dataviz validate_palette.js)
 * on the admin card surface #fbf7f3: adjacent colour-blind ΔE ≥ 9.1, normal-vision
 * ΔE ≥ 19.6. Use slots IN ORDER, never cycle past 8 (fold extras into "Other").
 * Aqua, yellow and magenta are under 3:1 contrast, so anything they colour must
 * also carry a visible text label (every admin chart here does).
 *
 * Text always stays in the normal ink colours; colour only marks identity.
 */
export const SERIES = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#6250d6",
  red: "#e34948",
} as const;

export type SeriesHue = keyof typeof SERIES;

/** Fixed categorical order (the colour-blind-safe sequence). */
export const SERIES_ORDER: string[] = [
  SERIES.blue,
  SERIES.orange,
  SERIES.aqua,
  SERIES.yellow,
  SERIES.magenta,
  SERIES.green,
  SERIES.violet,
  SERIES.red,
];

/** Neutral for "Other" / previous-period / anything that should recede. */
export const NEUTRAL = "#898781";

/** One-hue blue ramp for ordered steps (conversion funnel), dark → light.
 *  Validated as an ordinal ramp on the track colour #efe4da. */
export const FUNNEL_RAMP = ["#0d366b", "#184f95", "#256abf", "#3987e5", "#6da7ec"];

export const CHART_GRID = "#e1e0d9";

/** Each metric keeps the same colour on every admin page (Revenue is always blue…). */
const METRIC_HUES: [RegExp, SeriesHue][] = [
  [/refund|failed/i, "red"],
  [/profit/i, "violet"],
  [/discount/i, "yellow"],
  [/conversion|repeat/i, "yellow"],
  [/average|aov/i, "aqua"],
  [/visitor|session/i, "magenta"],
  [/customer|marketing/i, "green"],
  [/order|units|pending/i, "orange"],
  [/revenue|value|captured/i, "blue"],
];

export function metricColor(label: string): string {
  const hit = METRIC_HUES.find(([re]) => re.test(label));
  return SERIES[hit ? hit[1] : "blue"];
}
