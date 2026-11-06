// Every broker's year as one horizontal bar, ranked, in the price scale's grammar (DESIGN.md): the other brokers are
// neutral marks, the visitor's broker is ink. Trade prices, the one part every year has, take the neutral ramp's second
// step on every other broker's bar; a part the visitor adds (options fees, idle cash, margin interest; commissions once
// one costs anything) stacks after it in its series colour, keyed by an HTML <Legend> above the chart (it wraps on a phone
// instead of paging; the chart's own legend is off, and a single part needs no key). A part whose colour falls under 3:1
// on the card (the light theme's idle-cash pink, margin amber and commissions green) is edged in the same hue's deeper
// step (theme.tsx rim), so every mark reaches 3:1 without a new colour. The visitor's whole bar is ink (the ramp's first
// step), so it stands out however its parts split (the answer card above lists them), its name and total in 700 ink on a
// Here-tinted band: no teal, which marks only what can be pressed. A line missing a part reads "at least $9.80". The
// value axis is laid out for the width the page measured (charts/axis.ts): ticks at nice steps with room between their
// labels, and only as much room on the right as the totals beside the longest bars need. The bars don't animate: the one
// moving thing on the page is the dot on the scale.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { axisRange, textWidth } from "../../charts/axis";
import type { Option } from "../../charts/EChart";
import { base, catAxis, label, tip, tooltip, valueAxis } from "../../charts/kit";
import { yearSaid } from "../../lib/cash";
import type { CostLine, PARTS } from "../../lib/cost";
import { num, usd2 } from "../../lib/format";
import type { Tokens } from "../../lib/theme";
import { missingFact, totalWords, unknownWord } from "./model";

type Part = (typeof PARTS)[number];

/** A part's colour on every other broker's bar, in the tooltip and in the key: trade prices in the neutral ramp's second
 *  step, an added part in its series colour (lib/cost.ts PARTS slot, shared with the explorer's fee measures). Not Mark
 *  Grey, though it passes 3:1 on the card: beside the idle-cash pink it falls under the colour-blind floor (OKLab ΔE 5.0
 *  protan, light) and beside the commissions green under the normal-vision one (13.4). Ramp-2 clears both themes (ΔE 11.3
 *  and more against every part; 5.6:1 on the light card, 6.5:1 on the dark one) and sits a lightness step from ink. */
export const partColor = (t: Tokens, p: Part) => (p.key === "spread" ? t.ramp[1] : t.s[p.slot]);
/** A part's edge where its colour alone doesn't reach 3:1 on the card (theme.tsx rim), else null: the bars' seams stay in
 *  the card's colour. */
export const partEdge = (t: Tokens, p: Part): string | null => {
  if (p.key === "spread") return null;
  const rim = t.rim[p.slot];
  return rim && rim !== t.s[p.slot] ? rim : null;
};

/** A tick label: whole dollars as $0, $5, $1,000; cents only when the steps are smaller than a dollar. */
const tickText = (v: number) => (Number.isInteger(v) ? `${v < 0 ? "−" : ""}$${num(Math.abs(v))}` : usd2(v));

/** `width`: the chart's width as the page measured it (the axis is laid out for it). */
export function stackedBars(t: Tokens, rows: CostLine[], hl: string | undefined, parts: Part[], width: number): Option {
  const names = rows.map((r) => r.short);
  const fs = label();
  // the outermost non-zero part on each side takes the rounded data-end
  const edge = (r: CostLine, sign: 1 | -1) => { let k = -1; parts.forEach((p, i) => { if (r[p.key] * sign > 0) k = i; }); return k; };
  // the total sits right of the bar's positive end; for a negative total, right of its negative part, whose right end is
  // the zero line, so it lands in that row's empty right half rather than over the broker names
  const labelOn = (r: CostLine) => { const k = edge(r, r.total < 0 ? -1 : 1); return k < 0 ? parts.length - 1 : k; };
  const hlName = rows.find((r) => r.id === hl)?.short;
  const cell = (r: CostLine, p: Part) => { const f = missingFact(r, p.key); return f && p.key !== "spread" ? unknownWord(f) : yearSaid(r[p.key]); };
  // a few small negatives (prices better than the fair price) get a little room on the left, not a whole tick
  const lo = Math.min(0, ...rows.map((r) => parts.reduce((a, p) => a + Math.min(0, r[p.key]), 0)));
  const min = lo < 0 ? lo * 1.25 : 0;

  // ---- the value axis for the measured width. Where each total ends: the bar's positive end (or the zero line, for a
  // total below zero), then 5px and its words, in 700 for the visitor's broker
  const ends = rows.map((r) => (r.total < 0 ? 0 : parts.reduce((a, p) => a + Math.max(0, r[p.key]), 0)));
  const words = rows.map((r) => textWidth(totalWords(r), fs, r.id === hl ? 700 : 400) + 5);
  const nameW = Math.max(...rows.map((r) => textWidth(r.short, fs, r.id === hl ? 700 : 400)));
  const left = 4 + Math.ceil(nameW) + 8; // the grid's own 4px, the names, the axis label margin
  const hi = Math.max(...ends, 0);
  const room = (ticks: number[]) => Math.max(...ticks.map((v) => textWidth(tickText(v), fs))) + 16;
  const fit = (right: number) => {
    const plotW = Math.max(40, width - left - right);
    // the ticks over the part of the plot from zero up: up to six steps, as many as keep their labels apart
    const ax = axisRange(0, hi > 0 ? hi : 1, 6, plotW * (hi > 0 ? hi / (hi - min) : 1), room, false);
    // the right margin each total needs past the plot's end, and half the last tick label
    const need = Math.max(
      Math.ceil(textWidth(tickText(ax.max), fs) / 2) + 4,
      ...ends.map((e, i) => Math.ceil(words[i] - ((ax.max - e) / (ax.max - min)) * plotW) + 4),
    );
    return { ax, right: Math.max(8, need) };
  };
  // the margin and the axis depend on each other: settle them in a few passes (a wider margin never needs a finer step)
  let lay = fit(Math.ceil(Math.max(...words)) + 4);
  for (let k = 0; k < 3; k++) {
    const next = fit(lay.right);
    if (next.right === lay.right && next.ax.max === lay.ax.max) break;
    lay = next;
  }
  const { ax, right } = width > 0 ? lay : { ax: null, right: Math.ceil(Math.max(...words)) + 12 };

  return {
    ...base(t),
    animation: false,
    legend: { show: false },
    grid: { left: 4, right, top: 4, bottom: 4, containLabel: true },
    // ticks are round numbers: whole dollars read as $0, $5, $1,000; cents only when the steps are smaller than a dollar
    // the step as min and max interval, not as `interval`, which would start the ticks at the little room left of zero
    xAxis: valueAxis(t, {
      min, ...(ax ? { max: ax.max, minInterval: ax.step, maxInterval: ax.step, splitNumber: ax.ticks.length - 1 } : { splitNumber: 4 }),
      axisLabel: { formatter: tickText, hideOverlap: true, showMinLabel: min === 0 },
    }),
    yAxis: catAxis(t, names, {
      inverse: true, axisLine: { show: false },
      axisLabel: { rich: { hl: { color: t.ink, fontWeight: 700, fontSize: fs } }, formatter: (v: string) => (v === hlName ? `{hl|${v}}` : v) },
    }),
    tooltip: tooltip(t, {
      // the hovered row's band sits behind the bars (z 1, under the series' 2), so it never washes a bar or its total out
      trigger: "axis", axisPointer: { type: "shadow", z: 1, shadowStyle: { color: t.neutral, opacity: 0.35 } },
      formatter: (ps: any[]) => {
        const r = rows[ps[0].dataIndex];
        // the visitor's bar is ink throughout, so its parts take no swatch (none would match it)
        const sw = (p: Part) => (r.id === hl ? null : { fill: partColor(t, p), edge: partEdge(t, p) });
        return tip(r.short, [...parts.map((p) => [sw(p), p.label, cell(r, p)] as [ReturnType<typeof sw>, string, string]), [null, "A year", totalWords(r)]]);
      },
    }),
    series: parts.map((p, i) => ({
      name: p.label, type: "bar", stack: "all", barWidth: 14,
      itemStyle: { color: partColor(t, p), borderColor: partEdge(t, p) ?? t.surface, borderWidth: 1 },
      data: rows.map((r) => {
        const me = r.id === hl;
        const radius = i === edge(r, 1) ? [0, 4, 4, 0] : i === edge(r, -1) ? [4, 0, 0, 4] : 0;
        // a part worth nothing draws nothing, not even its edge
        const none = Math.abs(r[p.key]) < 0.005 ? { borderWidth: 0 } : {};
        return {
          value: r[p.key], id: r.id,
          // the visitor's broker: ink, its seams in the colour of the Here band it sits on
          itemStyle: me ? { color: t.ink, borderColor: t.here, borderRadius: radius, ...none } : { borderRadius: radius, ...none },
          label: i === labelOn(r) ? { show: true, position: "right", ...(me ? { color: t.ink, fontWeight: 700 } : {}) } : { show: false },
        };
      }),
      label: { color: t.ink2, fontSize: fs, formatter: (q: any) => totalWords(rows[q.dataIndex]) },
      emphasis: { disabled: true },
      cursor: "pointer",
      // the visitor's broker: the Here tint behind its row, as in every table
      markArea: i === 0 && hlName ? { silent: true, itemStyle: { color: t.here }, data: [[{ yAxis: hlName }, { yAxis: hlName }]] } : undefined,
    })),
  };
}
