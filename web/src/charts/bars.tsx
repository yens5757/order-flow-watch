import { scaleLinear } from "d3-scale";
import { useState, type ReactNode } from "react";
import { useWidth } from "../lib/hooks";
import { useTip } from "../components/Tooltip";
import { hbar, Svg, XGrid } from "./common";

const nameW = (w: number) => (w < 560 ? 96 : 132);

/** Hover-highlight band + full-row hit target shared by the row charts. */
function RowHit({ y, h, w, active, onEnter, onLeave, onClick }: {
  y: number; h: number; w: number; active: boolean; onEnter: (e: React.MouseEvent) => void; onLeave: () => void; onClick?: () => void;
}) {
  return (
    <>
      <rect x={0} y={y} width={w} height={h} rx={6} fill="var(--surface-2)" opacity={active ? 1 : 0} />
      <rect x={0} y={y} width={w} height={h} fill="transparent" style={{ cursor: onClick ? "pointer" : "default" }}
        onMouseMove={onEnter} onMouseLeave={onLeave} onClick={onClick} />
    </>
  );
}

// ---------- Ranked dots: one row per firm, dot at its value, optional right-hand column ----------
export function RankDots({ rows, color = "var(--s2)", leftNote, rightNote, colTitle, minDomain = [-10, 100], label }: {
  rows: { id: string; label: string; value: number; col?: string; tip: ReactNode }[];
  color?: string; leftNote?: string; rightNote?: string; colTitle?: string; minDomain?: [number, number]; label: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const narrow = W < 560, rowH = 30, m = { t: 26, r: colTitle ? (narrow ? 70 : 96) : 40, b: leftNote ? 48 : 30, l: nameW(W) };
  const H = m.t + m.b + rows.length * rowH;
  const vals = rows.map((r) => r.value);
  const x = scaleLinear().domain([Math.min(minDomain[0], ...vals), Math.max(minDomain[1], ...vals)]).nice().range([m.l, W - m.r]);
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={label}>
        <XGrid x={x} y0={m.t - 6} y1={H - m.b} fmt={(v) => `${v}%`} ticks={narrow ? 4 : 6} />
        {leftNote && <text x={x(0)} y={H - m.b + 35} textAnchor="middle" fontSize={12} fill={color}>{leftNote}</text>}
        {rightNote && <text x={x(100)} y={H - m.b + 35} textAnchor="middle" fontSize={12} fill={color}>{rightNote}</text>}
        {colTitle && <text x={W} y={m.t - 10} textAnchor="end" fontSize={12} fill="var(--muted)">{colTitle}</text>}
        {rows.map((r, i) => {
          const y = m.t + i * rowH, cy = y + rowH / 2;
          return (
            <g key={r.id}>
              <RowHit y={y} h={rowH} w={W} active={hover === r.id}
                onEnter={(e) => { setHover(r.id); tip.show(r.tip, e); }} onLeave={() => { setHover(null); tip.hide(); }} />
              <g pointerEvents="none">
                <text x={m.l - 12} y={cy} dy="0.32em" textAnchor="end" fontSize={13.5} fill="var(--ink)">{r.label}</text>
                <line x1={x(0)} x2={x(r.value)} y1={cy} y2={cy} stroke={color} strokeWidth={2} opacity={0.4} />
                <circle cx={x(r.value)} cy={cy} r={6} fill={color} stroke="var(--surface)" strokeWidth={2} />
                <text x={Math.max(x(r.value), x(0)) + 11} y={cy} dy="0.32em" fontSize={12.5} fill="var(--ink-2)" className="tnum">{r.value.toFixed(0)}%</text>
                {r.col && <text x={W} y={cy} dy="0.32em" textAnchor="end" fontSize={13} fill="var(--ink)" className="tnum">{r.col}</text>}
              </g>
            </g>
          );
        })}
      </Svg>
    </div>
  );
}

// ---------- Ranked bars: one value per row (payments, venue shares) ----------
export function RankBars({ rows, color = "var(--s1)", fmt, label, onClick, minMax = 5, nameWidth }: {
  rows: { id: string; label: string; value: number; text?: string; tip: ReactNode }[];
  color?: string; fmt: (v: number) => string; label: string; onClick?: (id: string) => void; minMax?: number; nameWidth?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const rowH = 30, m = { t: 6, r: 90, b: 28, l: nameWidth ?? nameW(W) };
  const H = m.t + m.b + rows.length * rowH;
  const vals = rows.map((r) => r.value);
  const x = scaleLinear().domain([Math.min(0, ...vals), Math.max(minMax, ...vals)]).nice().range([m.l, W - m.r]);
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={label}>
        <XGrid x={x} y0={m.t} y1={H - m.b} fmt={fmt} ticks={W < 560 ? 3 : 5} />
        {rows.map((r, i) => {
          const y = m.t + i * rowH, cy = y + rowH / 2;
          return (
            <g key={r.id}>
              <RowHit y={y} h={rowH} w={W} active={hover === r.id} onClick={onClick ? () => onClick(r.id) : undefined}
                onEnter={(e) => { setHover(r.id); tip.show(r.tip, e); }} onLeave={() => { setHover(null); tip.hide(); }} />
              <g pointerEvents="none">
                <text x={m.l - 12} y={cy} dy="0.32em" textAnchor="end" fontSize={13.5} fill="var(--ink)">{r.label}</text>
                <path d={hbar(x(0), x(r.value), cy - 8, 16)} fill={r.value < 0 ? "var(--worse)" : color} />
                <text x={Math.max(x(r.value), x(0)) + 7} y={cy} dy="0.32em" fontSize={12.5} fill="var(--ink-2)" className="tnum">
                  {r.text ?? fmt(r.value)}
                </text>
              </g>
            </g>
          );
        })}
      </Svg>
    </div>
  );
}

// ---------- Paired bars: broker is paid (blue) vs customer pays (orange), same unit ----------
export function PairedBars({ rows, onClick }: {
  rows: { id: string; label: string; pay: number | null; cost: number; tip: ReactNode }[]; onClick?: (id: string) => void;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const rowH = 38, bh = 12, m = { t: 6, r: 44, b: 30, l: nameW(W) };
  const H = m.t + m.b + rows.length * rowH;
  const vals = rows.flatMap((r) => [r.pay ?? 0, r.cost]);
  const x = scaleLinear().domain([Math.min(0, ...vals), Math.max(10, ...vals)]).nice().range([m.l, W - m.r]);
  const lab = (v: number, y: number) => (
    <text x={Math.max(x(v), x(0)) + 5} y={y + bh / 2} dy="0.32em" fontSize={11.5} fill="var(--ink-2)" className="tnum">{v.toFixed(0)}%</text>
  );
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label="Paired bars: share of the spread paid to each broker and paid by its customers">
        <XGrid x={x} y0={m.t} y1={H - m.b} fmt={(v) => `${v}%`} ticks={W < 560 ? 4 : 6} />
        {rows.map((r, i) => {
          const y = m.t + i * rowH, y1 = y + rowH / 2 - bh - 1, y2 = y + rowH / 2 + 1;
          return (
            <g key={r.id}>
              <RowHit y={y} h={rowH} w={W} active={hover === r.id} onClick={onClick ? () => onClick(r.id) : undefined}
                onEnter={(e) => { setHover(r.id); tip.show(r.tip, e); }} onLeave={() => { setHover(null); tip.hide(); }} />
              <g pointerEvents="none">
                <text x={m.l - 12} y={y + rowH / 2} dy="0.32em" textAnchor="end" fontSize={13.5} fill="var(--ink)">{r.label}</text>
                {r.pay != null ? <><path d={hbar(x(0), x(r.pay), y1, bh)} fill="var(--s1)" />{lab(r.pay, y1)}</>
                  : <text x={x(0) + 5} y={y1 + bh / 2} dy="0.32em" fontSize={11.5} fontStyle="italic" fill="var(--muted)">no 606 payment data</text>}
                <path d={hbar(x(0), x(r.cost), y2, bh)} fill="var(--s2)" />
                {lab(r.cost, y2)}
              </g>
            </g>
          );
        })}
      </Svg>
    </div>
  );
}

// ---------- Diverging gaps: better (blue, left) or worse (red, right) than peers on the same stocks ----------
export function GapBars({ rows, label, onClick, unit = "pts" }: {
  rows: { id: string; label: string; gap: number; implied?: number | null; tip: ReactNode }[];
  label: string; onClick?: (id: string) => void; unit?: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const narrow = W < 560, rowH = 30, m = { t: 26, r: 52, b: 30, l: nameW(W) };
  const H = m.t + m.b + rows.length * rowH;
  // 30% headroom so value labels at the bar ends never run into the names or the edge
  const ext = 1.3 * Math.max(10, ...rows.flatMap((r) => [Math.abs(r.gap), Math.abs(r.implied ?? 0)]));
  const x = scaleLinear().domain([-ext, ext]).nice().range([m.l, W - m.r]);
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label={label}>
        <XGrid x={x} y0={m.t - 4} y1={H - m.b} fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} ticks={narrow ? 4 : 6} />
        <text x={x(0) - 8} y={m.t - 12} textAnchor="end" fontSize={12} fill="var(--better)">← better prices than peers</text>
        <text x={x(0) + 8} y={m.t - 12} fontSize={12} fill="var(--worse)">worse →</text>
        {rows.map((r, i) => {
          const y = m.t + i * rowH, cy = y + rowH / 2;
          return (
            <g key={r.id}>
              <RowHit y={y} h={rowH} w={W} active={hover === r.id} onClick={onClick ? () => onClick(r.id) : undefined}
                onEnter={(e) => { setHover(r.id); tip.show(r.tip, e); }} onLeave={() => { setHover(null); tip.hide(); }} />
              <g pointerEvents="none">
                <text x={m.l - 12} y={cy} dy="0.32em" textAnchor="end" fontSize={13.5} fill="var(--ink)">{r.label}</text>
                <path d={hbar(x(0), x(r.gap), cy - 7, 14)} fill={r.gap < 0 ? "var(--better)" : "var(--worse)"} />
                {r.implied != null && (
                  <rect x={x(r.implied) - 1.5} y={cy - 10} width={3} height={20} rx={1.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1.5} />
                )}
                <text x={r.gap >= 0 ? x(r.gap) + 6 : x(r.gap) - 6} y={cy} dy="0.32em" textAnchor={r.gap >= 0 ? "start" : "end"}
                  fontSize={12} fill="var(--ink-2)" className="tnum">{`${r.gap > 0 ? "+" : r.gap < 0 ? "−" : ""}${Math.abs(r.gap).toFixed(0)} ${unit}`}</text>
              </g>
            </g>
          );
        })}
      </Svg>
    </div>
  );
}

// ---------- Follow the money: what the customer paid, split three ways ----------
export function MoneyBars({ rows }: {
  rows: { id: string; label: string; toBroker: number; toMM: number; moved: number; cust: number; tip: ReactNode }[];
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const rowH = 32, m = { t: 6, r: 52, b: 30, l: nameW(W) };
  const H = m.t + m.b + rows.length * rowH;
  const x = scaleLinear().domain([0, Math.max(20, ...rows.map((r) => r.cust))]).nice().range([m.l, W - m.r]);
  const segs: [keyof (typeof rows)[number], string][] = [["toBroker", "var(--s1)"], ["toMM", "var(--s2)"], ["moved", "var(--context)"]];
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label="Stacked bars: where the spread customers paid ended up">
        <XGrid x={x} y0={m.t} y1={H - m.b} fmt={(v) => `${v}%`} ticks={W < 560 ? 4 : 6} />
        {rows.map((r, i) => {
          const y = m.t + i * rowH, cy = y + rowH / 2;
          let acc = 0;
          const parts = segs.map(([k, c]) => {
            const v = Math.max(0, r[k] as number), x0 = x(acc), x1 = x(acc + v);
            acc += v;
            return { k, c, x0, x1 };
          }).filter((p) => p.x1 - p.x0 > 0.5);
          return (
            <g key={r.id}>
              <RowHit y={y} h={rowH} w={W} active={hover === r.id}
                onEnter={(e) => { setHover(r.id); tip.show(r.tip, e); }} onLeave={() => { setHover(null); tip.hide(); }} />
              <g pointerEvents="none">
                <text x={m.l - 12} y={cy} dy="0.32em" textAnchor="end" fontSize={13.5} fill="var(--ink)">{r.label}</text>
                {parts.map((p, j) => (
                  <path key={String(p.k)} d={j === parts.length - 1 ? hbar(p.x0, p.x1, cy - 8, 16) : `M${p.x0},${cy - 8}H${p.x1}V${cy + 8}H${p.x0}Z`}
                    fill={p.c} stroke="var(--surface)" strokeWidth={j ? 2 : 0} style={{ paintOrder: "stroke" }} />
                ))}
                <text x={x(Math.max(r.cust, acc)) + 7} y={cy} dy="0.32em" fontSize={12} fill="var(--ink-2)" className="tnum">{r.cust.toFixed(0)}%</text>
              </g>
            </g>
          );
        })}
      </Svg>
    </div>
  );
}
