import { scaleLinear } from "d3-scale";
import { useState, type ReactNode } from "react";
import { useWidth } from "../lib/hooks";
import { useTip } from "../components/Tooltip";
import { Svg, XGrid } from "./common";

// ---------- Step 1: bid / midpoint / ask on a $100 stock ----------
export function SpreadDiagram() {
  const [ref, W] = useWidth<HTMLDivElement>();
  const wide = W > 520;
  const x = scaleLinear().domain([99.96, 100.04]).range([30, Math.max(30, W - 30)]);
  const yl = 64, yb = wide ? yl + 56 : yl + 34, ys = yb + 46, H = ys + 10;
  const marks: [number, string, string, string][] = [
    [99.97, "Bid", "$99.97", "a buyer will pay"], [100, "Midpoint", "$100.00", "the fair price"], [100.03, "Ask", "$100.03", "a seller wants"]];
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label="Diagram: bid, midpoint and ask of a $100 stock">
        <rect x={x(100)} y={yl - 14} width={x(100.03) - x(100)} height={28} rx={6} fill="var(--cost-wash)" />
        <line x1={x(99.96)} x2={x(100.04)} y1={yl} y2={yl} stroke="var(--baseline)" strokeWidth={2} />
        {marks.map(([v, name, price, note]) => (
          <g key={name}>
            <circle cx={x(v)} cy={yl} r={6.5} fill={v === 100 ? "var(--ink)" : "var(--surface)"} stroke="var(--ink)" strokeWidth={2} />
            <text x={x(v)} y={yl - 40} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">{name}</text>
            <text x={x(v)} y={yl - 23} textAnchor="middle" fontSize={13} fill="var(--ink-2)" className="tnum">{price}</text>
            {wide && <text x={x(v)} y={yl + 32} textAnchor="middle" fontSize={12.5} fill="var(--muted)">{note}</text>}
          </g>
        ))}
        <path d={`M${x(99.97)},${yb - 6}V${yb}H${x(100.03)}V${yb - 6}`} fill="none" stroke="var(--muted)" />
        <text x={x(100)} y={yb + 18} textAnchor="middle" fontSize={13.5} fill="var(--ink)">The spread: 6 cents</text>
        <text x={x(99.97)} y={ys} textAnchor="middle" fontSize={12.5} fill="var(--muted)">If you buy at…</text>
        {[[100, "0%"], [100.015, "50%"], [100.03, "100%"]].map(([v, l]) => (
          <text key={l} x={x(v as number)} y={ys} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--s2)">{l}</text>
        ))}
      </Svg>
    </div>
  );
}

// ---------- Step 3: you -> broker -> market maker, payment back ----------
export function FlowDiagram() {
  const [ref, W] = useWidth<HTMLDivElement>();
  const narrow = W < 560, boxW = narrow ? 180 : 156, boxH = 56;
  const names: [string, string][] = [["You", "tap Buy"], ["Your broker", "e.g. a trading app"], ["Market maker", "e.g. Citadel, Virtu"]];
  const pos = narrow ? names.map((_, i) => [(W - boxW) / 2 - 30, 10 + i * 104]) : [[0, 30], [(W - boxW) / 2, 30], [W - boxW, 30]];
  const H = narrow ? 10 + 2 * 104 + boxH + 52 : 154;
  const note = narrow ? ["The market maker earns part of the spread", "and shares some of it with your broker."]
    : ["The market maker earns part of the spread and shares some of it with your broker."];
  const arrow = (d: string, pay = false) => <path d={d} fill="none" stroke={pay ? "var(--s1)" : "var(--ink-2)"} strokeWidth={2} markerEnd={pay ? "url(#arrPay)" : "url(#arr)"} />;
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label="Diagram: your order goes to your broker, then to a market maker, which pays the broker">
        <defs>
          {[["arr", "var(--ink-2)"], ["arrPay", "var(--s1)"]].map(([id, c]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0,0L10,5L0,10z" fill={c} />
            </marker>
          ))}
        </defs>
        {names.map(([a, b], i) => (
          <g key={a}>
            <rect x={pos[i][0]} y={pos[i][1]} width={boxW} height={boxH} rx={12} fill="var(--surface)" stroke="var(--border)" strokeWidth={1.5} />
            <text x={pos[i][0] + boxW / 2} y={pos[i][1] + 24} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--ink)">{a}</text>
            <text x={pos[i][0] + boxW / 2} y={pos[i][1] + 42} textAnchor="middle" fontSize={12} fill="var(--muted)">{b}</text>
          </g>
        ))}
        {narrow ? (() => {
          const cx = pos[0][0] + boxW / 2, rx = pos[0][0] + boxW + 22;
          return <>
            {[0, 1].map((i) => <g key={i}>
              {arrow(`M${cx},${pos[i][1] + boxH + 6}V${pos[i + 1][1] - 6}`)}
              <text x={cx + 10} y={(pos[i][1] + boxH + pos[i + 1][1]) / 2 + 4} fontSize={12.5} fill="var(--ink-2)">your order</text>
            </g>)}
            {arrow(`M${pos[2][0] + boxW + 4},${pos[2][1] + boxH / 2}H${rx}V${pos[1][1] + boxH / 2}H${pos[1][0] + boxW + 8}`, true)}
            <text x={rx + 6} y={(pos[1][1] + pos[2][1] + boxH) / 2 + 4} fontSize={12.5} fontWeight={600} fill="var(--s1)">$ payment</text>
          </>;
        })() : (() => {
          const yy = pos[0][1] + boxH / 2, mid = (pos[1][0] + boxW + pos[2][0]) / 2;
          return <>
            {arrow(`M${boxW + 6},${yy}H${pos[1][0] - 6}`)}
            <text x={(boxW + pos[1][0]) / 2} y={yy - 8} textAnchor="middle" fontSize={12.5} fill="var(--ink-2)">your order</text>
            {arrow(`M${pos[1][0] + boxW + 6},${yy - 8}H${pos[2][0] - 6}`)}
            <text x={mid} y={yy - 16} textAnchor="middle" fontSize={12.5} fill="var(--ink-2)">your order</text>
            {arrow(`M${pos[2][0] - 6},${yy + 10}H${pos[1][0] + boxW + 6}`, true)}
            <text x={mid} y={yy + 28} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--s1)">$ payment</text>
          </>;
        })()}
        {note.map((l, i) => <text key={l} x={W / 2} y={H - 8 - (note.length - 1 - i) * 16} textAnchor="middle" fontSize={narrow ? 11.5 : 12.5} fill="var(--muted)">{l}</text>)}
      </Svg>
    </div>
  );
}

// ---------- Heatmap: brokers x market makers ----------
export function Heatmap({ rows, cols, value, fmt, diverging, cellTip, onRow }: {
  rows: { id: string; label: string }[]; cols: string[];
  value: (row: string, col: string) => number | null; fmt: (v: number) => string; diverging?: boolean;
  cellTip: (row: string, col: string) => ReactNode; onRow?: (id: string) => void;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const narrow = W < 640, rowH = 34, m = { t: narrow ? 96 : 84, l: narrow ? 96 : 140 };
  const cw = Math.max(48, (W - m.l - 8) / Math.max(1, cols.length));
  const svgW = Math.max(W, m.l + 8 + cw * cols.length), H = m.t + 8 + rows.length * rowH;
  const vals = rows.flatMap((r) => cols.map((c) => value(r.id, c))).filter((v): v is number => v != null);
  const maxAbs = Math.max(1, ...vals.map(Math.abs));
  return (
    <div ref={ref} className="overflow-x-auto">
      <Svg width={svgW} height={H} label="Heatmap of broker routing by market maker">
        {cols.map((c, j) => (
          <text key={c} transform={`translate(${m.l + j * cw + cw / 2},${m.t - 10}) rotate(-35)`} fontSize={12} fill="var(--ink-2)">
            {c.length > 18 ? `${c.slice(0, 17)}…` : c}
          </text>
        ))}
        {rows.map((r, i) => {
          const yy = m.t + i * rowH;
          return (
            <g key={r.id}>
              <text x={m.l - 10} y={yy + rowH / 2} dy="0.32em" textAnchor="end" fontSize={13} fill="var(--ink)"
                style={{ cursor: onRow ? "pointer" : "default" }} onClick={onRow ? () => onRow(r.id) : undefined}>{r.label}</text>
              {cols.map((c, j) => {
                const v = value(r.id, c), xx = m.l + j * cw;
                const a = v == null || v === 0 ? 0 : diverging ? 0.15 + 0.85 * Math.abs(v) / maxAbs : Math.min(1, 0.1 + 0.9 * v / 100);
                const fill = a === 0 ? "var(--surface-2)" : diverging && (v as number) < 0 ? "var(--worse)" : "var(--s1)";
                return (
                  <g key={c} onMouseMove={(e) => tip.show(cellTip(r.id, c), e)} onMouseLeave={tip.hide}>
                    <rect x={xx + 1} y={yy + 1} width={cw - 2} height={rowH - 2} rx={5} fill={fill} fillOpacity={a === 0 ? 1 : a} />
                    {v != null && (diverging || v >= 1) && (
                      <text x={xx + cw / 2} y={yy + rowH / 2} dy="0.32em" textAnchor="middle" fontSize={11.5} pointerEvents="none"
                        fill={a > 0.55 ? "#ffffff" : "var(--ink-2)"} className="tnum">{fmt(v)}</text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </Svg>
    </div>
  );
}

// ---------- Strip plot: every Rule 605 reporter, one row per group ----------
export function Strip({ groups, points, onClick }: {
  groups: string[]; points: { id: string; group: string; value: number; highlight: boolean; tip: ReactNode }[]; onClick?: (id: string) => void;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<string | null>(null);
  const narrow = W < 640, rowH = 58, m = { t: 8, r: 20, b: 30, l: narrow ? 128 : 200 };
  const H = m.t + m.b + groups.length * rowH;
  const vals = points.map((p) => p.value).sort((a, b) => a - b);
  const lo = Math.min(0, vals[Math.floor(vals.length * 0.01)] ?? 0), hi = Math.min(250, Math.max(100, ...vals));
  const x = scaleLinear().domain([lo, hi]).nice().range([m.l, W - m.r]).clamp(true);
  const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <div ref={ref}>
      <Svg width={W} height={H} label="Strip plot of customer cost for every Rule 605 reporter">
        <XGrid x={x} y0={m.t} y1={H - m.b} fmt={(v) => `${v}%`} ticks={narrow ? 4 : 7} />
        {groups.map((g, i) => {
          const yy = m.t + i * rowH + rowH / 2, pts = points.filter((p) => p.group === g);
          const med = [...pts].sort((a, b) => a.value - b.value)[pts.length >> 1]?.value;
          return (
            <g key={g}>
              <text x={m.l - 12} y={yy - 2} textAnchor="end" fontSize={13} fill="var(--ink)">{g}</text>
              <text x={m.l - 12} y={yy + 14} textAnchor="end" fontSize={11} fill="var(--muted)">{pts.length} firms{med != null ? ` · median ${med.toFixed(0)}%` : ""}</text>
              {pts.map((p) => (
                <circle key={p.id} cx={x(p.value)} cy={yy + ((hash(p.id) % 100) / 100 - 0.5) * (rowH - 22)} r={hover === p.id ? 7 : 5}
                  fill={p.highlight ? "var(--s1)" : "var(--context)"} stroke="var(--surface)" strokeWidth={2}
                  style={{ cursor: onClick && p.highlight ? "pointer" : "default" }}
                  onMouseMove={(e) => { setHover(p.id); tip.show(p.tip, e); }} onMouseLeave={() => { setHover(null); tip.hide(); }}
                  onClick={onClick && p.highlight ? () => onClick(p.id) : undefined} />
              ))}
            </g>
          );
        })}
      </Svg>
    </div>
  );
}
