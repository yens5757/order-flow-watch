// Shared chart styling: recessive axes and grid, thin marks, one tooltip look. Colours come from theme tokens.
import type { Tokens } from "../lib/theme";

/** The site's face (Figtree, self-hosted: see main.tsx), so chart labels match the text around them. */
export const FONT = '"Figtree Variable", Figtree, system-ui, -apple-system, "Segoe UI", sans-serif';

export const base = (t: Tokens) => ({
  backgroundColor: "transparent",
  textStyle: { fontFamily: FONT, color: t.ink2 },
  animationDuration: 700,
  animationEasing: "cubicOut" as const,
  aria: { enabled: true },
});

export const tooltip = (t: Tokens, extra: object = {}) => ({
  confine: true,
  backgroundColor: t.surface2,
  borderColor: t.border,
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: t.ink, fontSize: 12.5, fontFamily: FONT },
  extraCssText: `border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,${t.dark ? 0.45 : 0.12});`,
  ...extra,
});

export const valueAxis = (t: Tokens, extra: object = {}) => ({
  type: "value",
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 11.5 },
  splitLine: { lineStyle: { color: t.grid } },
  nameTextStyle: { color: t.muted, fontSize: 11.5 },
  ...extra,
});

export const catAxis = (t: Tokens, data: string[], extra: object = {}) => ({
  type: "category",
  data,
  axisLine: { lineStyle: { color: t.baseline } },
  axisTick: { show: false },
  axisLabel: { color: t.ink2, fontSize: 12 },
  ...extra,
});

export const legend = (t: Tokens, extra: object = {}) => ({
  type: "scroll", // stays on one line on phones instead of wrapping onto the plot
  pageIconColor: t.ink2,
  pageIconInactiveColor: t.context,
  pageTextStyle: { color: t.muted },
  top: 0,
  left: 0,
  icon: "roundRect",
  itemWidth: 10,
  itemHeight: 10,
  itemGap: 16,
  textStyle: { color: t.ink2, fontSize: 12 },
  inactiveColor: t.context,
  ...extra,
});

const esc = (s: string) => s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]!);

/** Tooltip body: a title, then rows of [swatch colour | null, label, value], then an optional footnote. */
export function tip(title: string, rows: [string | null, string, string][], foot?: string) {
  const row = ([c, l, v]: [string | null, string, string]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:18px;line-height:1.75">` +
    `<span style="display:flex;align-items:center;gap:7px;opacity:.8">` +
    (c ? `<i style="width:9px;height:9px;border-radius:3px;background:${c};display:inline-block"></i>` : "") +
    `${esc(l)}</span><b style="font-weight:600;font-variant-numeric:tabular-nums">${esc(v)}</b></div>`;
  return `<div style="font-weight:600;margin-bottom:4px">${esc(title)}</div>` + rows.map(row).join("") +
    (foot ? `<div style="margin-top:6px;opacity:.6;font-size:11.5px;max-width:240px;white-space:normal">${esc(foot)}</div>` : "");
}

/* ---------- colour arithmetic for labels drawn on coloured cells ---------- */
const rgb = (h: string) => { const n = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); };
const luminance = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG contrast ratio of two hex colours. */
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** The colour at `p` (0–1) along evenly spaced stops, as a visual map paints a value between its min and max. */
export function colourAt(stops: string[], p: number): string {
  const x = Math.max(0, Math.min(1, p)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = rgb(stops[i]), b = rgb(stops[i + 1]);
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, "0")).join("")}`;
}
/** Whichever text colour reads best on a background. */
export const readableOn = (bg: string, inks: string[]) => inks.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best));

/** Rounded data-end (4px) on the outer side of a bar, flat against the baseline. */
export const hEnd = (v: number) => (v >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]);
export const vEnd = (v: number) => (v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]);
