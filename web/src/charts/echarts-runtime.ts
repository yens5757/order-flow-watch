// ECharts itself, tree-shaken to the chart types this site uses: lines and stacked columns (charts/options.ts), the
// calculator's stacked bars, the explorer's scatter and a broker's routing ring. Only EChart.tsx loads this module, with a
// dynamic import when a chart first mounts, so a page that draws no chart (a broker page) never downloads the library.
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { LabelLayout } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart,
  AriaComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent,
  LabelLayout, SVGRenderer,
]);

export { echarts };
