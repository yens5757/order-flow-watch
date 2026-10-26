import { Delaunay } from "d3-delaunay";
import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { useMemo, useState, type ReactNode } from "react";
import { useWidth } from "../lib/hooks";
import { median } from "../lib/stats";
import { useTip } from "../components/Tooltip";
import { hbar, Labels, placeLabels, Svg, vbar, YGrid } from "./common";

// ---------- Scatter with plain-language corners ----------
export function Scatter({ points, xLabel, yLabel, fmt = (v) => `${v}%`, corners, onClick, height }: {
  points: { id: string; label: string; x: number; y: number; tip: ReactNode }[];
  xLabel: string; yLabel: string; fmt?: (v: number) => string;
  corners?: { tl: string; tr: string; bl: string; br: string; trShort?: string }; onClick?: (id: string) => void; height?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const narrow = W < 560, H = height ?? (narrow ? 440 : 520);
  const m = { t: corners ? 34 : 14, r: narrow ? 8 : 24, b: corners ? 78 : 52, l: narrow ? 50 : 58 };
  const x = scaleLinear().domain([Math.min(0, ...points.map((p) => p.x)), Math.max(5, ...points.map((p) => p.x))]).nice().range([m.l, W - m.r]);
  const y = scaleLinear().domain([Math.min(0, ...points.map((p) => p.y)), Math.max(40, ...points.map((p) => p.y))]).nice().range([H - m.b, m.t]);
  const pts = points.map((p) => ({ ...p, px: x(p.x), py: y(p.y) }));
  const mx = median(points.map((p) => p.x)) ?? 0, my = median(points.map((p) => p.y)) ?? 0;
  const placed = useMemo(() => placeLabels(pts.map((p) => ({ px: p.px, py: p.py, text: p.label })), W - m.r, m.t, H - m.b),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [W, H, points]);
  const delaunay = useMemo(() => Delaunay.from(pts, (p) => p.px, (p) => p.py), [pts]);
  const nearest = (e: React.MouseEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top, p = pts[delaunay.find(px, py)];
    return p && Math.hypot(p.px - px, p.py - py) < 40 ? p : null;
  };
  const fs = narrow ? 11 : 12.5;
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={`Scatter: ${xLabel} against ${yLabel}`}>
        {corners && <rect x={x(mx)} y={m.t} width={Math.max(0, W - m.r - x(mx))} height={Math.max(0, y(my) - m.t)} fill="var(--cost-wash)" />}
        <YGrid y={y} x0={m.l} x1={W - m.r} fmt={fmt} />
        {x.ticks(5).map((t) => <text key={t} x={x(t)} y={H - m.b + 18} textAnchor="middle" fontSize={11.5} fill="var(--muted)" className="tnum">{fmt(t)}</text>)}
        {corners && <>
          <line x1={x(mx)} x2={x(mx)} y1={m.t} y2={H - m.b} stroke="var(--baseline)" />
          <line x1={m.l} x2={W - m.r} y1={y(my)} y2={y(my)} stroke="var(--baseline)" />
          <text x={W - m.r} y={m.t - 12} textAnchor="end" fontSize={fs} fontWeight={650} fill="var(--s2)">{narrow ? corners.trShort ?? corners.tr : corners.tr} ↗</text>
          <text x={m.l} y={m.t - 12} fontSize={fs} fill="var(--muted)">↖ {corners.tl}</text>
          <text x={m.l} y={H - m.b + 40} fontSize={fs} fill="var(--muted)">↙ {corners.bl}</text>
          <text x={W - m.r} y={H - m.b + 40} textAnchor="end" fontSize={fs} fill="var(--muted)">{corners.br} ↘</text>
        </>}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">{xLabel}</text>
        <text transform={`translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">{yLabel}</text>
        <Labels placed={placed} />
        {pts.map((p) => (
          <circle key={p.id} cx={p.px} cy={p.py} r={hover === p.id ? 8.5 : 6.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        <rect x={m.l} y={m.t} width={Math.max(0, W - m.l - m.r)} height={Math.max(0, H - m.t - m.b)} fill="transparent"
          style={{ cursor: onClick ? "pointer" : "default" }}
          onMouseMove={(e) => { const p = nearest(e); setHover(p?.id ?? null); if (p) tip.show(p.tip, e); else tip.hide(); }}
          onMouseLeave={() => { setHover(null); tip.hide(); }}
          onClick={(e) => { const p = nearest(e); if (p && onClick) onClick(p.id); }} />
      </Svg>
    </div>
  );
}

// ---------- Link-strength gauge ----------
export function Meter({ rho }: { rho: number | null }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = 70, y = 26, h = 12;
  const x = scaleLinear().domain([0, 1]).range([4, Math.max(4, W - 4)]);
  const zones: [number, number, string][] = [[0, 0.2, "none / very weak"], [0.2, 0.4, "weak"], [0.4, 0.6, "moderate"], [0.6, 1, "strong"]];
  const v = rho == null ? null : Math.min(1, Math.abs(rho));
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={`Gauge: link strength ${rho == null ? "unknown" : rho.toFixed(2)}`}>
        {zones.map(([a, b, l], i) => (
          <g key={l}>
            <rect x={x(a) + (i ? 1 : 0)} y={y} width={x(b) - x(a) - (i ? 1 : 0)} height={h} rx={i === 0 || i === 3 ? 6 : 0} fill="var(--pay-wash)" />
            <text x={(x(a) + x(b)) / 2} y={y + h + 18} textAnchor="middle" fontSize={W < 480 ? 10.5 : 12} fill="var(--muted)">{l}</text>
          </g>
        ))}
        {v != null && rho != null && <>
          <path d={hbar(x(0), x(v), y, h, 6)} fill="var(--s1)" />
          <circle cx={x(v)} cy={y + h / 2} r={9} fill="var(--s1)" stroke="var(--surface)" strokeWidth={3} />
          <text x={x(v)} y={y - 8} textAnchor={x(v) < 30 ? "start" : "middle"} fontSize={15} fontWeight={650} fill="var(--ink)">
            {`${rho >= 0 ? "+" : "−"}${Math.abs(rho).toFixed(2)}`}
          </text>
        </>}
      </Svg>
    </div>
  );
}

// ---------- Lines over ordered categories, optional range band, end labels ----------
export interface Series { name: string; color: string; values: (number | null)[]; width?: number; dots?: boolean }
export function Lines({ x: cats, xFmt, series, band, yFmt, height = 260, endLabels, label, tipTitle }: {
  x: string[]; xFmt: (c: string) => string; series: Series[]; band?: { lo: number | null; hi: number | null }[];
  yFmt: (v: number) => string; height?: number; endLabels?: boolean; label: string; tipTitle?: (c: string) => string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [at, setAt] = useState<number | null>(null);
  const H = height, m = { t: 14, r: endLabels ? (W < 560 ? 92 : 130) : 16, b: 34, l: 50 };
  const x = scalePoint<string>().domain(cats).range([m.l + 8, W - m.r - 8]);
  const all = [...series.flatMap((s) => s.values), ...(band ?? []).flatMap((b) => [b.lo, b.hi]), 0].filter((v): v is number => v != null);
  const y = scaleLinear().domain([Math.min(...all), Math.max(...all)]).nice().range([H - m.b, m.t]);
  const every = Math.ceil(cats.length / Math.max(2, Math.floor((W - m.l - m.r) / 64)));
  const ends = endLabels
    ? placeLabels(series.map((s) => {
        const i = s.values.map((v, k) => (v == null ? -1 : k)).filter((k) => k >= 0).pop() ?? 0;
        return { px: (x(cats[i]) ?? 0) - 3, py: y(s.values[i] ?? 0), text: s.name };
      }), W + 400, m.t, H - m.b)
    : [];
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={label}>
        <YGrid y={y} x0={m.l} x1={W - m.r} fmt={yFmt} ticks={5} />
        {cats.map((c, i) => i % every === 0 && (
          <text key={c} x={x(c)} y={H - m.b + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">{xFmt(c)}</text>
        ))}
        {band && <path fill="var(--wash)" d={area<number>().defined((i) => band[i].lo != null).x((i) => x(cats[i]) ?? 0)
          .y0((i) => y(band[i].lo ?? 0)).y1((i) => y(band[i].hi ?? 0)).curve(curveMonotoneX)(cats.map((_, i) => i)) ?? ""} />}
        {at != null && <line x1={x(cats[at])} x2={x(cats[at])} y1={m.t} y2={H - m.b} stroke="var(--baseline)" />}
        {series.map((s) => (
          <g key={s.name}>
            <path fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeLinejoin="round" strokeLinecap="round"
              d={line<number>().defined((i) => s.values[i] != null).x((i) => x(cats[i]) ?? 0).y((i) => y(s.values[i] ?? 0))
                .curve(curveMonotoneX)(cats.map((_, i) => i)) ?? ""} />
            {s.dots !== false && s.values.map((v, i) => v != null && (
              <circle key={i} cx={x(cats[i])} cy={y(v)} r={at === i ? 5.5 : 4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        ))}
        {ends.map((q) => (
          <text key={q.text} x={(x(cats[cats.length - 1]) ?? 0) + 10} y={q.ly} dy="0.32em" fontSize={12} fill="var(--ink-2)">{q.text}</text>
        ))}
        <rect x={m.l} y={m.t} width={Math.max(0, W - m.l - m.r)} height={Math.max(0, H - m.t - m.b)} fill="transparent"
          onMouseMove={(e) => {
            const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(), px = e.clientX - r.left;
            let best = 0;
            cats.forEach((c, i) => { if (Math.abs((x(c) ?? 0) - px) < Math.abs((x(cats[best]) ?? 0) - px)) best = i; });
            setAt(best);
            tip.show(<>
              <div className="mb-1 font-semibold">{tipTitle ? tipTitle(cats[best]) : cats[best]}</div>
              {series.map((s) => (
                <div key={s.name} className="flex justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-ink2"><i className="inline-block h-[2px] w-3" style={{ background: s.color }} />{s.name}</span>
                  <span className="tnum">{s.values[best] == null ? "–" : yFmt(s.values[best] as number)}</span>
                </div>
              ))}
              {band?.[best]?.lo != null && <div className="mt-1 text-muted">Range {yFmt(band[best].lo as number)} to {yFmt(band[best].hi as number)}</div>}
            </>, e);
          }}
          onMouseLeave={() => { setAt(null); tip.hide(); }} />
      </Svg>
    </div>
  );
}

// ---------- Stacked columns (2px surface gap between segments) ----------
export function Columns({ x: cats, xFmt, series, yFmt, height = 260, label, tipTitle }: {
  x: string[]; xFmt: (c: string) => string; series: { name: string; color: string; values: number[] }[];
  yFmt: (v: number) => string; height?: number; label: string; tipTitle?: (c: string) => string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [at, setAt] = useState<number | null>(null);
  const H = height, m = { t: 14, r: 12, b: 34, l: 62 };
  const x = scaleBand<string>().domain(cats).range([m.l, W - m.r]).padding(0.3);
  const totals = cats.map((_, i) => series.reduce((a, s) => a + Math.max(0, s.values[i]), 0));
  const y = scaleLinear().domain([0, Math.max(1, ...totals)]).nice().range([H - m.b, m.t]);
  const bw = Math.min(26, x.bandwidth());
  const every = Math.ceil(cats.length / Math.max(2, Math.floor((W - m.l - m.r) / 56)));
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={label}>
        <YGrid y={y} x0={m.l} x1={W - m.r} fmt={yFmt} ticks={4} />
        {cats.map((c, i) => {
          const cx = (x(c) ?? 0) + x.bandwidth() / 2;
          let acc = 0;
          const live = series.filter((s) => s.values[i] > 0);
          return (
            <g key={c} opacity={at == null || at === i ? 1 : 0.55}>
              {i % every === 0 && <text x={cx} y={H - m.b + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">{xFmt(c)}</text>}
              {live.map((s, j) => {
                const y0 = y(acc), y1 = y(acc + s.values[i]);
                acc += s.values[i];
                return <path key={s.name} d={j === live.length - 1 ? vbar(cx - bw / 2, bw, y0, y1) : `M${cx - bw / 2},${y0}V${y1}H${cx + bw / 2}V${y0}Z`}
                  fill={s.color} stroke="var(--surface)" strokeWidth={j ? 2 : 0} style={{ paintOrder: "stroke" }} />;
              })}
            </g>
          );
        })}
        <rect x={m.l} y={m.t} width={Math.max(0, W - m.l - m.r)} height={Math.max(0, H - m.t - m.b)} fill="transparent"
          onMouseMove={(e) => {
            const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(), px = e.clientX - r.left;
            let best = 0;
            cats.forEach((c, i) => { if (Math.abs((x(c) ?? 0) + x.bandwidth() / 2 - px) < Math.abs((x(cats[best]) ?? 0) + x.bandwidth() / 2 - px)) best = i; });
            setAt(best);
            tip.show(<>
              <div className="mb-1 font-semibold">{tipTitle ? tipTitle(cats[best]) : cats[best]} · {yFmt(totals[best])}</div>
              {series.map((s) => (
                <div key={s.name} className="flex justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-ink2"><i className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />{s.name}</span>
                  <span className="tnum">{yFmt(s.values[best])}</span>
                </div>
              ))}
            </>, e);
          }}
          onMouseLeave={() => { setAt(null); tip.hide(); }} />
      </Svg>
    </div>
  );
}
