// Every broker's year as one horizontal bar, ranked, its parts stacked in the validated series colours. The key is an HTML
// <Legend> above the chart (it wraps on a phone instead of paging), so the chart's own legend is off. The visitor's broker
// is named in bold ink on a Here-tinted band: no teal, which marks only what can be pressed. A line missing a part reads
// "at least $9.80". The bars don't animate: the one moving thing on the page is the dot on the scale.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Option } from "../../charts/EChart";
import { base, catAxis, label, tip, tooltip, valueAxis } from "../../charts/kit";
import { yearly } from "../../lib/broker";
import type { CostLine, PARTS } from "../../lib/cost";
import { num, usd2 } from "../../lib/format";
import type { Tokens } from "../../lib/theme";
import { missingFact, totalWords, unknownWord } from "./model";

type Part = (typeof PARTS)[number];

export function stackedBars(t: Tokens, rows: CostLine[], hl: string | undefined, parts: Part[]): Option {
  const names = rows.map((r) => r.short);
  const fs = label();
  // the outermost non-zero part on each side takes the rounded data-end
  const edge = (r: CostLine, sign: 1 | -1) => { let k = -1; parts.forEach((p, i) => { if (r[p.key] * sign > 0) k = i; }); return k; };
  // the total sits right of the bar's positive end; for a negative total, right of its negative part, whose right end is
  // the zero line, so it lands in that row's empty right half rather than over the broker names
  const labelOn = (r: CostLine) => { const k = edge(r, r.total < 0 ? -1 : 1); return k < 0 ? parts.length - 1 : k; };
  const hlName = rows.find((r) => r.id === hl)?.short;
  const cell = (r: CostLine, p: Part) => { const f = missingFact(r, p.key); return f && p.key !== "spread" ? unknownWord(f) : yearly(r[p.key]); };
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
      trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.neutral, opacity: 0.35 } },
      formatter: (ps: any[]) => {
        const r = rows[ps[0].dataIndex];
        return tip(r.short, [...parts.map((p) => [t.s[p.slot], p.label, cell(r, p)] as [string, string, string]), [null, "A year", totalWords(r)]]);
      },
    }),
    series: parts.map((p, i) => ({
      name: p.label, type: "bar", stack: "all", barWidth: 14,
      itemStyle: { color: t.s[p.slot], borderColor: t.surface, borderWidth: 1 },
      data: rows.map((r) => ({
        value: r[p.key], id: r.id,
        itemStyle: { borderRadius: i === edge(r, 1) ? [0, 4, 4, 0] : i === edge(r, -1) ? [4, 0, 0, 4] : 0 },
        label: i === labelOn(r) ? { show: true, position: "right" } : { show: false },
      })),
      label: { color: t.ink2, fontSize: fs, formatter: (q: any) => totalWords(rows[q.dataIndex]) },
      emphasis: { disabled: true },
      cursor: "pointer",
      // the visitor's broker: the Here tint behind its row, as in every table
      markArea: i === 0 && hlName ? { silent: true, itemStyle: { color: t.surface2 }, data: [[{ yAxis: hlName }, { yAxis: hlName }]] } : undefined,
    })),
  };
}
