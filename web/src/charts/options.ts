// Option builders: plain rows in, a styled interactive ECharts option out. Only the charts drawn with ECharts are here:
// lines over time (trading firms' volume shares, a broker's payment rate, cost by order size on Compare) and stacked
// columns (a broker's payments by type of trade). Rankings, scales and the forest plot are drawn in CSS by their pages.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tokens } from "../lib/theme";
import type { Option } from "./EChart";
import { base, catAxis, label, legend, tip, tooltip, valueAxis, vEnd } from "./kit";

type Row = [string | null, string, string];

/* ---------- lines over time (optionally stacked areas), labelled at the end ---------- */
export function lines(t: Tokens, cats: string[], series: { name: string; values: (number | null)[]; color: string; dashed?: boolean }[], o: {
  fmt: (v: number) => string; area?: boolean; stack?: boolean; endLabels?: boolean; total?: boolean; min?: number; max?: number;
}): Option {
  return {
    ...base(t),
    legend: legend(t),
    grid: { left: 8, right: o.endLabels ? 96 : 20, top: 38, bottom: 8, containLabel: true },
    xAxis: catAxis(t, cats, { boundaryGap: false, axisLabel: { color: t.muted, fontSize: label() } }),
    yAxis: valueAxis(t, { min: o.min, max: o.max, axisLabel: { color: t.muted, formatter: (v: number) => o.fmt(v) } }),
    tooltip: tooltip(t, {
      trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.baseline } },
      formatter: (ps: any[]) => {
        const rows = ps.filter((p) => p.value != null).map((p) => [p.color, p.seriesName, o.fmt(p.value)] as Row);
        if (o.total) rows.push([null, "Total", o.fmt(ps.reduce((a, p) => a + (p.value ?? 0), 0))]);
        return tip(ps[0].axisValue, rows);
      },
    }),
    series: series.map((s) => ({
      name: s.name, type: "line", data: s.values, smooth: 0.25, connectNulls: true,
      stack: o.stack ? "all" : undefined,
      symbol: "circle", symbolSize: 8, showSymbol: !o.area,
      lineStyle: { width: 2, color: s.color, type: s.dashed ? "dashed" : "solid" },
      itemStyle: { color: s.color, borderColor: t.surface, borderWidth: 2 },
      areaStyle: o.area ? { color: s.color, opacity: t.dark ? 0.28 : 0.22 } : undefined,
      endLabel: o.endLabels ? { show: true, formatter: "{a}", color: t.ink2, fontSize: label(), distance: 8 } : undefined,
      labelLayout: o.endLabels ? { moveOverlap: "shiftY" } : undefined,
      emphasis: { focus: "series" },
    })),
  };
}

/* ---------- stacked columns over time ---------- */
export function stackedColumns(t: Tokens, cats: string[], series: { name: string; values: number[]; color: string }[], fmt: (v: number) => string): Option {
  return {
    ...base(t),
    legend: legend(t),
    grid: { left: 8, right: 12, top: 38, bottom: 8, containLabel: true },
    xAxis: catAxis(t, cats, { axisLabel: { color: t.muted, fontSize: label() } }),
    yAxis: valueAxis(t, { axisLabel: { color: t.muted, formatter: fmt } }),
    tooltip: tooltip(t, {
      trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.neutral, opacity: 0.25 } },
      formatter: (ps: any[]) => tip(ps[0].axisValue, [...ps.map((p) => [p.color, p.seriesName, fmt(p.value)] as Row), [null, "Total", fmt(ps.reduce((a, p) => a + p.value, 0))]]),
    }),
    series: series.map((s, i) => ({
      name: s.name, type: "bar", stack: "all", barWidth: "52%", itemStyle: { color: s.color },
      data: s.values.map((v) => ({ value: v, itemStyle: { color: s.color, borderColor: t.surface, borderWidth: 1, borderRadius: i === series.length - 1 ? vEnd(v) : 0 } })),
      emphasis: { focus: "series" },
    })),
  };
}
