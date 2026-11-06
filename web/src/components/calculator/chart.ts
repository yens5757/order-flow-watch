// Every broker's year as one horizontal bar, ranked, in the price scale's grammar (DESIGN.md): the other brokers are
// neutral marks, the visitor's broker is ink. Trade prices, the one part every year has, take the neutral ramp's second
// step on every other broker's bar; a part the visitor adds (options fees, idle cash, margin interest; commissions once
// one costs anything) stacks after it in its series colour, keyed by an HTML <Legend> above the chart (it wraps on a phone
// instead of paging; the chart's own legend is off, and a single part needs no key). The visitor's whole bar is ink (the
// ramp's first step), so it stands out however its parts split (the answer card above lists them), its name and total in
// 700 ink on a Here-tinted band: no teal, which marks only what can be pressed. A line missing a part reads "at least
// $9.80". The bars don't animate: the one moving thing on the page is the dot on the scale.
/* eslint-disable @typescript-eslint/no-explicit-any */
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

export function stackedBars(t: Tokens, rows: CostLine[], hl: string | undefined, parts: Part[]): Option {
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
  // room on the right for the longest total ("at least $1,250"), about 0.56em a character in Figtree at the label size
  const right = Math.ceil(Math.max(0, ...rows.map((r) => totalWords(r).length)) * fs * 0.56) + 12;
  return {
    ...base(t),
    animation: false,
    legend: { show: false },
    grid: { left: 4, right, top: 4, bottom: 4, containLabel: true },
    // ticks are round numbers: whole dollars read as $0, $5, $1,000; cents only when the steps are smaller than a dollar
    xAxis: valueAxis(t, { min, splitNumber: 4, axisLabel: { formatter: (v: number) => (Number.isInteger(v) ? `${v < 0 ? "−" : ""}$${num(Math.abs(v))}` : usd2(v)), hideOverlap: true, showMinLabel: min === 0 } }),
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
        const sw = (p: Part) => (r.id === hl ? null : partColor(t, p));
        return tip(r.short, [...parts.map((p) => [sw(p), p.label, cell(r, p)] as [string | null, string, string]), [null, "A year", totalWords(r)]]);
      },
    }),
    series: parts.map((p, i) => ({
      name: p.label, type: "bar", stack: "all", barWidth: 14,
      itemStyle: { color: partColor(t, p), borderColor: t.surface, borderWidth: 1 },
      data: rows.map((r) => {
        const me = r.id === hl;
        const radius = i === edge(r, 1) ? [0, 4, 4, 0] : i === edge(r, -1) ? [4, 0, 0, 4] : 0;
        return {
          value: r[p.key], id: r.id,
          // the visitor's broker: ink, its seams in the colour of the Here band it sits on
          itemStyle: me ? { color: t.ink, borderColor: t.surface2, borderRadius: radius } : { borderRadius: radius },
          label: i === labelOn(r) ? { show: true, position: "right", ...(me ? { color: t.ink, fontWeight: 700 } : {}) } : { show: false },
        };
      }),
      label: { color: t.ink2, fontSize: fs, formatter: (q: any) => totalWords(rows[q.dataIndex]) },
      emphasis: { disabled: true },
      cursor: "pointer",
      // the visitor's broker: the Here tint behind its row, as in every table
      markArea: i === 0 && hlName ? { silent: true, itemStyle: { color: t.surface2 }, data: [[{ yAxis: hlName }, { yAxis: hlName }]] } : undefined,
    })),
  };
}
