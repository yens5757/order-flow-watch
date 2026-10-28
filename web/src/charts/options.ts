// Option builders: plain rows in, a styled interactive ECharts option out.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tokens } from "../lib/theme";
import type { Option } from "./EChart";
import { base, catAxis, hEnd, legend, tip, tooltip, valueAxis, vEnd } from "./kit";

type Row = [string | null, string, string];
const CLICK = "Click to open the broker profile";

/* ---------- scatter with a name on every dot ---------- */
export interface Pt { id: string; name: string; x: number; y: number; dim?: boolean; rows?: Row[] }

export function labeledScatter(t: Tokens, pts: Pt[], o: {
  xName: string; yName: string; xFmt: (v: number) => string; yFmt: (v: number) => string; clickable?: boolean;
}): Option {
  return {
    ...base(t),
    grid: { left: 16, right: 76, top: 18, bottom: 44, containLabel: true },
    xAxis: valueAxis(t, { name: o.xName, nameLocation: "middle", nameGap: 30, scale: true, axisLabel: { color: t.muted, formatter: o.xFmt, hideOverlap: true } }),
    yAxis: valueAxis(t, { name: o.yName, nameLocation: "middle", nameGap: 44, scale: true, axisLabel: { color: t.muted, formatter: o.yFmt } }),
    tooltip: tooltip(t, {
      trigger: "item",
      formatter: (p: any) => tip(p.data.name, p.data.rows ?? [[null, o.xName, o.xFmt(p.data.value[0])], [null, o.yName, o.yFmt(p.data.value[1])]], o.clickable ? CLICK : undefined),
    }),
    series: [{
      type: "scatter",
      symbolSize: (_: unknown, p: any) => (p.data.dim ? 8 : 13),
      data: pts.map((p) => ({ value: [p.x, p.y], name: p.name, id: p.id, dim: p.dim, rows: p.rows,
        itemStyle: { color: p.dim ? t.context : t.s[0] } })),
      itemStyle: { borderColor: t.surface, borderWidth: 2 },
      label: { show: true, formatter: (p: any) => (p.data.dim ? "" : p.data.name), position: "right", distance: 6, color: t.ink2, fontSize: 11.5 },
      labelLayout: { hideOverlap: true },
      emphasis: { scale: 1.35, label: { color: t.ink, fontWeight: 600 } },
      cursor: o.clickable ? "pointer" : "default",
    }],
  };
}

/* ---------- diverging bars: better (left, blue) vs worse (right, red) ---------- */
export function divergingBars(t: Tokens, rows: { id: string; name: string; v: number; rows?: Row[] }[], o: { clickable?: boolean; unit?: string }): Option {
  // headroom on both sides so the value labels at the bar ends stay inside the plot
  const ext = Math.max(5, ...rows.map((r) => Math.abs(r.v))) * 1.45;
  const sign = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");
  const fmt = (v: number) => `${sign(v)}${Math.abs(v).toFixed(1)}`;
  return {
    ...base(t),
    grid: { left: 8, right: 12, top: 6, bottom: 24, containLabel: true },
    xAxis: valueAxis(t, { min: -ext, max: ext, axisLabel: { color: t.muted, hideOverlap: true,
      formatter: (v: number) => (Math.abs(v) < 1e-9 ? "0" : `${sign(v)}${Math.abs(Math.round(v))}`) } }),
    yAxis: catAxis(t, rows.map((r) => r.name), { inverse: true, axisLine: { show: false } }),
    tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(p.name, [[p.color, "Gap", `${fmt(p.value)}${o.unit ?? ""}`], ...(rows[p.dataIndex].rows ?? [])], o.clickable ? CLICK : undefined) }),
    series: [{
      type: "bar",
      barWidth: 12,
      data: rows.map((r) => ({ value: r.v, id: r.id, itemStyle: { color: r.v < 0 ? t.better : t.worse, borderRadius: hEnd(r.v) },
        label: { position: r.v < 0 ? "left" : "right" } })),
      label: { show: true, color: t.ink2, fontSize: 11.5, formatter: (p: any) => fmt(p.value) },
      markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: t.baseline, type: "solid", width: 1 }, data: [{ xAxis: 0 }] },
      emphasis: { focus: "self" },
      cursor: o.clickable ? "pointer" : "default",
    }],
  };
}

/* ---------- horizontal bars, one series ---------- */
export function hBars(t: Tokens, rows: { id: string; name: string; v: number; rows?: Row[] }[], o: {
  fmt: (v: number) => string; color: string; clickable?: boolean; title?: string;
}): Option {
  return {
    ...base(t),
    grid: { left: 8, right: 56, top: 6, bottom: 8, containLabel: true },
    xAxis: valueAxis(t, { show: false }),
    yAxis: catAxis(t, rows.map((r) => r.name), { inverse: true, axisLine: { show: false } }),
    tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(p.name, rows[p.dataIndex].rows ?? [[o.color, o.title ?? "Value", o.fmt(p.value)]], o.clickable ? CLICK : undefined) }),
    series: [{
      type: "bar",
      barWidth: 12,
      showBackground: true,
      backgroundStyle: { color: t.neutral, opacity: 0.35, borderRadius: 4 },
      data: rows.map((r) => ({ value: r.v, id: r.id, itemStyle: { color: o.color, borderRadius: hEnd(r.v) } })),
      label: { show: true, position: "right", color: t.ink2, fontSize: 11.5, formatter: (p: any) => o.fmt(p.value) },
      cursor: o.clickable ? "pointer" : "default",
    }],
  };
}

/* ---------- two measures per row, side by side ---------- */
export function pairedBars(t: Tokens, rows: { id: string; name: string; a: number | null; b: number | null }[], o: {
  aName: string; bName: string; fmt: (v: number) => string;
}): Option {
  const series = (name: string, color: string, k: "a" | "b") => ({
    name, type: "bar", barWidth: 8, barGap: "45%", itemStyle: { color },
    data: rows.map((r) => ({ value: r[k], id: r.id, itemStyle: { color, borderRadius: hEnd(r[k] ?? 0) } })),
    emphasis: { focus: "series" },
    cursor: "pointer",
  });
  return {
    ...base(t),
    legend: legend(t),
    grid: { left: 8, right: 24, top: 34, bottom: 24, containLabel: true },
    xAxis: valueAxis(t, { axisLabel: { color: t.muted, formatter: (v: number) => o.fmt(v) } }),
    yAxis: catAxis(t, rows.map((r) => r.name), { inverse: true, axisLine: { show: false } }),
    tooltip: tooltip(t, {
      trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.neutral, opacity: 0.25 } },
      formatter: (ps: any[]) => tip(ps[0].name, ps.map((p) => [p.color, p.seriesName, p.value == null ? "not reported" : o.fmt(p.value)] as Row), CLICK),
    }),
    series: [series(o.aName, t.s[0], "a"), series(o.bName, t.s[1], "b")],
  };
}

/* ---------- stacked horizontal bars (parts of a whole per row) ---------- */
export function stackedBars(t: Tokens, rows: { id: string; name: string; parts: number[]; total?: number }[], parts: { name: string; color: string }[], o: {
  fmt: (v: number) => string; foot?: string;
}): Option {
  return {
    ...base(t),
    legend: legend(t),
    grid: { left: 8, right: 24, top: 34, bottom: 24, containLabel: true },
    xAxis: valueAxis(t, { axisLabel: { color: t.muted, formatter: (v: number) => o.fmt(v) } }),
    yAxis: catAxis(t, rows.map((r) => r.name), { inverse: true, axisLine: { show: false } }),
    tooltip: tooltip(t, {
      trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.neutral, opacity: 0.25 } },
      formatter: (ps: any[]) => {
        const r = rows[ps[0].dataIndex];
        return tip(r.name, [...ps.map((p) => [p.color, p.seriesName, o.fmt(p.value)] as Row), [null, "Customer pays in total", o.fmt(r.total ?? r.parts.reduce((a, b) => a + b, 0))]], o.foot);
      },
    }),
    series: parts.map((p, i) => ({
      name: p.name, type: "bar", stack: "all", barWidth: 14, itemStyle: { color: p.color },
      data: rows.map((r) => ({ value: r.parts[i], id: r.id,
        itemStyle: { color: p.color, borderColor: t.surface, borderWidth: 1, borderRadius: i === parts.length - 1 ? [0, 4, 4, 0] : 0 } })),
      emphasis: { focus: "series" },
      cursor: "pointer",
    })),
  };
}

/* ---------- lines over time (optionally stacked areas), labelled at the end ---------- */
export function lines(t: Tokens, cats: string[], series: { name: string; values: (number | null)[]; color: string; dashed?: boolean }[], o: {
  fmt: (v: number) => string; area?: boolean; stack?: boolean; endLabels?: boolean; total?: boolean; min?: number;
}): Option {
  return {
    ...base(t),
    legend: legend(t),
    grid: { left: 8, right: o.endLabels ? 96 : 20, top: 38, bottom: 8, containLabel: true },
    xAxis: catAxis(t, cats, { boundaryGap: false, axisLabel: { color: t.muted, fontSize: 11.5 } }),
    yAxis: valueAxis(t, { min: o.min, axisLabel: { color: t.muted, formatter: (v: number) => o.fmt(v) } }),
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
      endLabel: o.endLabels ? { show: true, formatter: "{a}", color: t.ink2, fontSize: 11.5, distance: 8 } : undefined,
      labelLayout: o.endLabels ? { moveOverlap: "shiftY" } : undefined,
      emphasis: { focus: "series" },
    })),
  };
}

/* ---------- this broker vs every other broker, by order size ---------- */
export function bandLine(t: Tokens, cats: string[], d: { v: (number | null)[]; med: (number | null)[]; lo: (number | null)[]; hi: (number | null)[] }, o: {
  name: string; fmt: (v: number) => string;
}): Option {
  const band = d.hi.map((h, i) => (h == null || d.lo[i] == null ? null : h - d.lo[i]!));
  return {
    ...base(t),
    legend: legend(t, { data: [o.name, "Median broker", "Range of all brokers"] }),
    grid: { left: 8, right: 20, top: 38, bottom: 8, containLabel: true },
    xAxis: catAxis(t, cats, { boundaryGap: false, axisLabel: { color: t.muted, fontSize: 11.5 } }),
    yAxis: valueAxis(t, { axisLabel: { color: t.muted, formatter: (v: number) => o.fmt(v) } }),
    tooltip: tooltip(t, {
      trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.baseline } },
      formatter: (ps: any[]) => {
        const i = ps[0].dataIndex;
        const f = (v: number | null) => (v == null ? "–" : o.fmt(v));
        return tip(`Orders ${cats[i]}`, [[t.s[1], o.name, f(d.v[i])], [t.muted, "Median broker", f(d.med[i])], [null, "All brokers", `${f(d.lo[i])} to ${f(d.hi[i])}`]]);
      },
    }),
    series: [
      { name: "lo", type: "line", data: d.lo, stack: "band", symbol: "none", lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
      { name: "Range of all brokers", type: "line", data: band, stack: "band", symbol: "none", lineStyle: { opacity: 0 },
        areaStyle: { color: t.context, opacity: t.dark ? 0.35 : 0.45 }, itemStyle: { color: t.context }, silent: true },
      { name: "Median broker", type: "line", data: d.med, symbol: "none", lineStyle: { color: t.muted, type: "dashed", width: 1.5 }, itemStyle: { color: t.muted } },
      { name: o.name, type: "line", data: d.v, symbol: "circle", symbolSize: 8, connectNulls: true,
        lineStyle: { color: t.s[1], width: 2.5 }, itemStyle: { color: t.s[1], borderColor: t.surface, borderWidth: 2 } },
    ],
  };
}

/* ---------- donut ---------- */
export function donut(t: Tokens, slices: { name: string; v: number; color: string; rows?: Row[] }[], fmt: (v: number) => string): Option {
  return {
    ...base(t),
    tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(p.name, slices[p.dataIndex].rows ?? [[p.color, "Share", fmt(p.value)]]) }),
    legend: legend(t, { orient: "vertical", top: "middle", left: "58%", itemGap: 10, formatter: (n: string) => {
      const s = slices.find((x) => x.name === n);
      return s ? `${n}  ${fmt(s.v)}` : n;
    } }),
    series: [{
      type: "pie", radius: ["52%", "78%"], center: ["28%", "50%"], padAngle: 1.5,
      itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: slices.map((s) => ({ name: s.name, value: s.v, itemStyle: { color: s.color } })),
    }],
  };
}

/* ---------- stacked columns over time ---------- */
export function stackedColumns(t: Tokens, cats: string[], series: { name: string; values: number[]; color: string }[], fmt: (v: number) => string): Option {
  return {
    ...base(t),
    legend: legend(t),
    grid: { left: 8, right: 12, top: 38, bottom: 8, containLabel: true },
    xAxis: catAxis(t, cats, { axisLabel: { color: t.muted, fontSize: 11.5 } }),
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

/* ---------- heatmap (rows x columns), one-hue sequential ---------- */
export function heatmap(t: Tokens, rows: string[], cols: string[], cells: [number, number, number | null][], o: {
  fmt: (v: number) => string; label: string; rowIds?: string[];
}): Option {
  const vals = cells.map((c) => c[2]).filter((v): v is number => v != null);
  const max = Math.max(1, ...vals);
  const ink = (v: number) => (v > max * 0.55 ? (t.dark ? "#0b0e14" : "#ffffff") : t.ink2);
  return {
    ...base(t),
    grid: { left: 8, right: 8, top: 8, bottom: 44, containLabel: true },
    xAxis: catAxis(t, cols, { position: "top", splitArea: { show: false }, axisLine: { show: false },
      axisLabel: { color: t.ink2, fontSize: 11.5, rotate: 30, interval: 0, width: 100, overflow: "truncate" } }),
    yAxis: catAxis(t, rows, { inverse: true, axisLine: { show: false } }),
    visualMap: { min: 0, max, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 12, itemHeight: 160,
      text: [o.fmt(max), "0"], textStyle: { color: t.muted, fontSize: 11 }, inRange: { color: t.seq }, dimension: 2 },
    tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(rows[p.data.value[1]], [[null, cols[p.data.value[0]], p.data.value[2] == null ? "–" : o.fmt(p.data.value[2])]], o.rowIds ? CLICK : undefined) }),
    series: [{
      type: "heatmap",
      data: cells.filter((c) => c[2] != null).map((c) => ({ value: c, label: { show: true, color: ink(c[2]!), textBorderWidth: 0 } })),
      itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: true, fontSize: 10.5, formatter: (p: any) => (p.data.value[2] >= max * 0.02 ? o.fmt(p.data.value[2]) : "") },
      emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 1 } },
      cursor: o.rowIds ? "pointer" : "default",
    }],
  };
}

/* ---------- strip plot: one dot per firm, grouped in rows ---------- */
export function strip(t: Tokens, groups: string[], pts: { id: string; name: string; g: number; x: number; hl: boolean; rows: Row[] }[], o: { xName: string; fmt: (v: number) => string }): Option {
  // deterministic jitter so dots in the same row don't sit on one line
  const jitter = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return ((h % 1000) / 1000) * 0.5 - 0.25; };
  // a category axis carries the row names; the dots sit on a hidden value axis with the same rows, so they can be jittered
  return {
    ...base(t),
    grid: { left: 8, right: 24, top: 10, bottom: 40, containLabel: true },
    xAxis: valueAxis(t, { name: o.xName, nameLocation: "middle", nameGap: 28, axisLabel: { color: t.muted, formatter: o.fmt } }),
    yAxis: [
      catAxis(t, groups, { inverse: true, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: t.grid } } }),
      valueAxis(t, { show: false, min: -0.5, max: groups.length - 0.5, inverse: true }),
    ],
    tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(p.data.name, p.data.rows, p.data.hl ? CLICK : undefined) }),
    series: [{
      type: "scatter", yAxisIndex: 1,
      data: pts.map((p) => ({ value: [p.x, p.g + jitter(p.id)], name: p.name, id: p.id, hl: p.hl, rows: p.rows,
        symbolSize: p.hl ? 12 : 8, itemStyle: { color: p.hl ? t.s[0] : t.context, opacity: p.hl ? 1 : 0.85 } })),
      itemStyle: { borderColor: t.surface, borderWidth: 1.5 },
      emphasis: { scale: 1.5 },
    }],
  };
}

/* ---------- forest plot: estimate with 95% interval per claim ---------- */
export function forest(t: Tokens, items: { label: string; rho: number; lo: number; hi: number; color: string; rows: Row[] }[]): Option {
  return {
    ...base(t),
    grid: { left: 8, right: 24, top: 10, bottom: 36, containLabel: true },
    xAxis: valueAxis(t, { min: -1, max: 1, name: "Rank correlation (−1 to +1) with 95% interval", nameLocation: "middle", nameGap: 26 }),
    yAxis: catAxis(t, items.map((i) => i.label), { inverse: true, axisLine: { show: false },
      axisLabel: { color: t.ink2, fontSize: 12, width: 250, overflow: "break", lineHeight: 15 } }),
    tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => tip(items[p.data.i].label, items[p.data.i].rows) }),
    series: [
      {
        type: "custom",
        silent: true,
        renderItem: (_: unknown, api: any) => {
          const a = api.coord([api.value(0), api.value(2)]), b = api.coord([api.value(1), api.value(2)]);
          return { type: "line", shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: items[api.value(3)].color, lineWidth: 2, opacity: 0.6 } };
        },
        data: items.map((it, i) => [it.lo, it.hi, i, i]),
        encode: { x: [0, 1], y: 2 },
      },
      {
        type: "scatter", symbolSize: 11,
        data: items.map((it, i) => ({ value: [it.rho, i], i, itemStyle: { color: it.color, borderColor: t.surface, borderWidth: 2 } })),
        markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: t.baseline, type: "dashed" }, data: [{ xAxis: 0 }] },
      },
    ],
  };
}
