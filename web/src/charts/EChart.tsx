// Thin React wrapper around ECharts. The library is loaded on demand (echarts-runtime.ts, a dynamic import in the effect
// below), so pages without a chart never fetch it; the container keeps its fixed height meanwhile, so nothing shifts.
import { useEffect, useRef, useState } from "react";
import type * as Echarts from "echarts/core";

export type Option = Echarts.EChartsCoreOption;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClickParams = { data?: any; name?: string; seriesName?: string; dataIndex?: number };

/** One download for every chart on the site, started by the first chart that mounts. A failed download is forgotten,
 *  so the next chart to mount tries again (a dropped connection, or a redeploy that renamed the file). */
let runtime: Promise<typeof import("./echarts-runtime")> | null = null;
const loadRuntime = () => (runtime ??= import("./echarts-runtime").catch((e: unknown) => { runtime = null; throw e; }));

export function EChart({ option, height = 320, label, onClick }: {
  option: Option; height?: number; label: string; onClick?: (p: ClickParams) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<Echarts.ECharts | null>(null);
  const [ready, setReady] = useState(false);
  const click = useRef(onClick);
  click.current = onClick;

  useEffect(() => {
    let live = true;
    let ro: ResizeObserver | null = null;
    loadRuntime().then(({ echarts }) => {
      if (!live || !el.current) return;
      const c = echarts.init(el.current, undefined, { renderer: "svg" });
      chart.current = c;
      c.on("click", (p) => click.current?.(p as ClickParams));
      ro = new ResizeObserver(() => c.resize());
      ro.observe(el.current);
      setReady(true);
    }).catch(() => { /* offline or blocked: the box stays empty; the tables beside the charts still carry the numbers */ });
    return () => { live = false; ro?.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);

  // ECharts' aria component rewrites the container's aria-label with a generated description (ten data points per series at
  // most) on every setOption, so the hand-written label goes in as that description and wins. Builders with media rules
  // keep their option under baseOption, where the aria setting has to go too.
  useEffect(() => {
    if (!ready) return;
    const aria = { enabled: true, label: { description: label } };
    const o = option.baseOption ? { ...option, baseOption: { ...(option.baseOption as object), aria } } : { ...option, aria };
    chart.current?.setOption(o, { notMerge: true });
  }, [option, label, ready]);

  return <div ref={el} role="img" aria-label={label} style={{ height }} className="w-full" />;
}
