// The explorer's scatter, for "Compare with": one ink dot per broker with its name beside it, a dashed mark-grey line at
// the typical (median) broker on each axis, the shared chart styling from charts/kit.ts (Figtree in the label size,
// hairline gridlines, the raised-panel tooltip that Escape hides). No click: the broker pages open from the table's
// names, which are real links. On a phone the axis titles shorten so they stay inside the card.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Option } from "../../charts/EChart";
import { base, label, tip, tooltip, valueAxis } from "../../charts/kit";
import type { Tokens } from "../../lib/theme";

export interface Dot { id: string; name: string; x: number; y: number; rows: [string | null, string, string][] }

export function scatterOption(t: Tokens, dots: Dot[], o: {
  x: { name: string; short: string; fmt: (v: number) => string };
  y: { name: string; short: string; fmt: (v: number) => string };
  typical: [number, number];
}): Option {
  return {
    baseOption: {
      ...base(t),
      grid: { left: 20, right: 72, top: 26, bottom: 46, containLabel: true },
      xAxis: valueAxis(t, { name: o.x.name, nameLocation: "middle", nameGap: 32, scale: true,
        axisLabel: { formatter: o.x.fmt, hideOverlap: true } }),
      yAxis: valueAxis(t, { name: o.y.name, nameLocation: "middle", nameGap: 54, scale: true,
        axisLabel: { formatter: o.y.fmt } }),
      tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(p.data.name, p.data.rows) }),
      series: [{
        type: "scatter",
        symbolSize: 12,
        data: dots.map((d) => ({ value: [d.x, d.y], name: d.name, id: d.id, rows: d.rows })),
        itemStyle: { color: t.ink, borderColor: t.surface, borderWidth: 2, opacity: 1 },
        label: { show: true, formatter: (p: any) => p.data.name, position: "right", distance: 6, color: t.ink2, fontSize: label() },
        labelLayout: { hideOverlap: true },
        emphasis: { scale: 1.3, label: { color: t.ink, fontWeight: 700 } },
        markLine: {
          silent: true, symbol: "none",
          lineStyle: { color: t.mark, type: "dashed", width: 1 },
          label: { color: t.ink2, fontSize: label(), formatter: "Typical" },
          data: [{ xAxis: o.typical[0], label: { position: "end" } }, { yAxis: o.typical[1], label: { position: "end" } }],
        },
      }],
    },
    media: [{ query: { maxWidth: 520 }, option: {
      grid: { right: 56 },
      xAxis: { name: o.x.short },
      yAxis: { name: o.y.short, nameGap: 46 },
    } }],
  };
}
