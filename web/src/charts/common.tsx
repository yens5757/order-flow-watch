import type { ScaleLinear } from "d3-scale";
import type { ReactNode } from "react";

/** Horizontal bar with a 4px rounded data-end, square at the baseline (works for negative values too). */
export function hbar(x0: number, x1: number, y: number, h: number, r = 4) {
  const l = Math.min(x0, x1), rr = Math.max(x0, x1), w = rr - l;
  r = Math.min(r, w, h / 2);
  if (w <= 0.5) return "";
  return x1 >= x0
    ? `M${l},${y}H${rr - r}Q${rr},${y} ${rr},${y + r}V${y + h - r}Q${rr},${y + h} ${rr - r},${y + h}H${l}Z`
    : `M${rr},${y}H${l + r}Q${l},${y} ${l},${y + r}V${y + h - r}Q${l},${y + h} ${l + r},${y + h}H${rr}Z`;
}

/** Column rounded at the top end only. */
export function vbar(x: number, w: number, y0: number, y1: number, r = 4) {
  const top = Math.min(y0, y1), bot = Math.max(y0, y1), h = bot - top;
  r = Math.min(r, h, w / 2);
  if (h <= 0.5) return "";
  return `M${x},${bot}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${bot}Z`;
}

export function Svg({ width, height, label, children }: { width: number; height: number; label: string; children: ReactNode }) {
  if (!width) return <div style={{ height }} />;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block overflow-visible">
      {children}
    </svg>
  );
}

/** Vertical gridlines + tick labels for a horizontal value axis. */
export function XGrid({ x, y0, y1, fmt, ticks = 5 }: { x: ScaleLinear<number, number>; y0: number; y1: number; fmt: (v: number) => string; ticks?: number }) {
  return (
    <g>
      {x.ticks(ticks).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={y0} y2={y1} stroke={t === 0 ? "var(--baseline)" : "var(--grid)"} />
          <text x={x(t)} y={y1 + 17} textAnchor="middle" fontSize={11.5} fill="var(--muted)" className="tnum">{fmt(t)}</text>
        </g>
      ))}
    </g>
  );
}

/** Horizontal gridlines + tick labels for a vertical value axis. */
export function YGrid({ y, x0, x1, fmt, ticks = 5 }: { y: ScaleLinear<number, number>; x0: number; x1: number; fmt: (v: number) => string; ticks?: number }) {
  return (
    <g>
      {y.ticks(ticks).map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--baseline)" : "var(--grid)"} />
          <text x={x0 - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11.5} fill="var(--muted)" className="tnum">{fmt(t)}</text>
        </g>
      ))}
    </g>
  );
}

export interface Placed { lx: number; ly: number; w: number; left: boolean; px: number; py: number; text: string }

/** Put each label beside its point, then push overlapping labels apart (both ways) until none overlap. */
export function placeLabels(pts: { px: number; py: number; text: string }[], right: number, top: number, bottom: number): Placed[] {
  const placed = pts.map((p) => {
    const w = p.text.length * 6.9 + 4, left = p.px > right - w - 14;
    return { ...p, w, left, lx: left ? p.px - 11 - w : p.px + 11, ly: p.py };
  });
  for (let it = 0, moved = true; moved && it < 400; it++) {
    moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i], b = placed[j];
        if (a.lx >= b.lx + b.w || b.lx >= a.lx + a.w) continue;
        const d = b.ly - a.ly, need = 15 - Math.abs(d);
        if (need <= 0) continue;
        const s = (d >= 0 ? 1 : -1) * (need / 2 + 0.1);
        a.ly -= s; b.ly += s; moved = true;
      }
    }
    for (const q of placed) q.ly = Math.max(top + 6, Math.min(bottom - 6, q.ly));
  }
  return placed;
}

export function Labels({ placed, size = 12.5 }: { placed: Placed[]; size?: number }) {
  return (
    <g>
      {placed.map((q) => Math.abs(q.ly - q.py) > 5 && (
        <line key={`l${q.text}`} x1={q.px} y1={q.py} x2={q.left ? q.lx + q.w + 2 : q.lx - 2} y2={q.ly} stroke="var(--context)" />
      ))}
      {placed.map((q) => (
        <text key={q.text} x={q.left ? q.lx + q.w : q.lx} y={q.ly} dy="0.32em" textAnchor={q.left ? "end" : "start"} fontSize={size} fill="var(--ink)">
          {q.text}
        </text>
      ))}
    </g>
  );
}
