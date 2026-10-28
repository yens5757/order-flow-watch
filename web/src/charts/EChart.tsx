// Thin React wrapper around ECharts (tree-shaken: only the chart types this site uses).
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, CustomChart, HeatmapChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent,
} from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
  BarChart, CustomChart, HeatmapChart, LineChart, PieChart, ScatterChart,
  AriaComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent,
  LabelLayout, UniversalTransition, SVGRenderer,
]);

export type Option = echarts.EChartsCoreOption;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClickParams = { data?: any; name?: string; seriesName?: string; dataIndex?: number };

export function EChart({ option, height = 320, label, onClick }: {
  option: Option; height?: number; label: string; onClick?: (p: ClickParams) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const click = useRef(onClick);
  click.current = onClick;

  useEffect(() => {
    const c = echarts.init(el.current!, undefined, { renderer: "svg" });
    chart.current = c;
    c.on("click", (p) => click.current?.(p as ClickParams));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); c.dispose(); chart.current = null; };
  }, []);

  useEffect(() => { chart.current?.setOption(option, { notMerge: true }); }, [option]);

  return <div ref={el} role="img" aria-label={label} style={{ height }} className="w-full" />;
}
