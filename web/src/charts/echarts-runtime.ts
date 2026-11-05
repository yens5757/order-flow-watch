// ECharts itself, tree-shaken to the chart types this site uses. Only EChart.tsx loads this module, with a dynamic import
// when a chart first mounts, so a page that draws no chart (a broker page) never downloads the library.
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

export { echarts };
