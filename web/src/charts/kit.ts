// Shared chart styling in the site's world: Figtree in the label size, recessive axes and hairline gridlines, thin marks,
// and a tooltip that is the site's raised panel (Raised Tint, 14px corners, the Pop shadow). Colours come from theme
// tokens; the series colours stay in charts. EChart.tsx turns animation off for anyone who asked for less motion.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tokens } from "../lib/theme";

/** The site's face (Figtree, self-hosted: see main.tsx), so chart labels match the text around them. */
export const FONT = '"Figtree Variable", Figtree, system-ui, -apple-system, "Segoe UI", sans-serif';

/** A step of the rem type scale in px, for chart text (ECharts takes numbers): at the reader's own root size, so charts
 *  grow with the page's text. 16px when there is no document (the pre-render). */
export const rem = (r: number) => {
  const root = typeof document === "undefined" ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return Math.round(r * root * 10) / 10;
};
/** The label step (0.875rem): every word and number a chart draws. */
export const label = () => rem(0.875);

export const base = (t: Tokens) => ({
  backgroundColor: "transparent",
  textStyle: { fontFamily: FONT, color: t.ink2, fontSize: label() },
  animationDuration: 700,
  animationEasing: "cubicOut" as const,
  aria: { enabled: true },
});

/** The tooltip: the raised panel, hoverable (the pointer can move onto it) and hidden by Escape (EChart.tsx). */
export const tooltip = (t: Tokens, extra: object = {}) => ({
  confine: true,
  enterable: true,
  backgroundColor: t.surface2,
  borderColor: t.border,
  borderWidth: 1,
  padding: [10, 14],
  textStyle: { color: t.ink, fontSize: label(), fontFamily: FONT },
  extraCssText: `border-radius:14px;box-shadow:${t.pop};`,
  ...extra,
});

/** A value axis: no line or ticks, hairline gridlines, labels in the axis grey. `extra.axisLabel`, `splitLine` and
 *  `nameTextStyle` add to these rather than replace them. */
export const valueAxis = (t: Tokens, extra: Record<string, any> = {}) => {
  const { axisLabel, splitLine, nameTextStyle, ...rest } = extra;
  return {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: label(), ...axisLabel },
    splitLine: { lineStyle: { color: t.grid }, ...splitLine },
    nameTextStyle: { color: t.muted, fontSize: label(), ...nameTextStyle },
    ...rest,
  };
};

/** A category axis: the baseline in the chart-axis colour, names in secondary ink. `extra.axisLabel` adds to these. */
export const catAxis = (t: Tokens, data: string[], extra: Record<string, any> = {}) => {
  const { axisLabel, ...rest } = extra;
  return {
    type: "category",
    data,
    axisLine: { lineStyle: { color: t.baseline } },
    axisTick: { show: false },
    axisLabel: { color: t.ink2, fontSize: label(), ...axisLabel },
    ...rest,
  };
};

/** The chart's own legend: on one line that pages when it runs out of room, with 20px pager arrows in the action colour.
 *  A page that would rather show its key as text puts a <Legend> (ui.tsx) above the chart and `legend: { show: false }`. */
export const legend = (t: Tokens, extra: object = {}) => ({
  type: "scroll",
  top: 0,
  left: 0,
  icon: "roundRect",
  itemWidth: 10,
  itemHeight: 10,
  itemGap: 18,
  textStyle: { color: t.ink2, fontSize: label() },
  inactiveColor: t.context,
  pageIconSize: 20,
  pageIconColor: t.accent,
  pageIconInactiveColor: t.mark,
  pageButtonItemGap: 10,
  pageButtonGap: 12,
  pageTextStyle: { color: t.ink2, fontSize: label() },
  ...extra,
});

const esc = (s: string) => s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]!);

/** Tooltip body: a title, then rows of [swatch colour | null, label, value], then an optional footnote. The tooltip is
 *  HTML in the page, so its text takes the theme's inks straight from the custom properties. */
export function tip(title: string, rows: [string | null, string, string][], foot?: string) {
  const row = ([c, l, v]: [string | null, string, string]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:20px;line-height:1.6">` +
    `<span style="display:flex;align-items:center;gap:8px;color:var(--ink-2)">` +
    (c ? `<i style="flex:none;width:10px;height:10px;border-radius:3px;background:${c};display:inline-block"></i>` : "") +
    `${esc(l)}</span><b style="font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums">${esc(v)}</b></div>`;
  return `<div style="font-weight:700;color:var(--ink);margin-bottom:4px">${esc(title)}</div>` + rows.map(row).join("") +
    (foot ? `<div style="margin-top:8px;color:var(--ink-2);max-width:16rem;white-space:normal;line-height:1.45">${esc(foot)}</div>` : "");
}

/** Rounded data-end (4px) on the outer side of a column, flat against the baseline. */
export const vEnd = (v: number) => (v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]);
