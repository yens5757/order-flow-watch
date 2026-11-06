// The explorer's scatter, for "Compare with": one ink dot per broker, a dashed mark-grey line at the typical (median)
// broker on each axis (named in the HTML key above the chart, so no word in the plot can run into it), the shared chart
// styling from charts/kit.ts (Figtree in the label size, hairline gridlines, the raised-panel tooltip that Escape hides).
// No click: the broker pages open from the table's names, which are real links.
// The names are placed here, not by ECharts: its label layout only hides overlapping labels or pushes them along one
// axis as a single column (moveOverlap), and never looks at the dots, so on a scatter it sets names on dots and on each
// other. Here each name tries places round its own dot: right, left, above and below (centred on the dot, then slid
// along it either way while the word still spans it), each side again 6 and 12px further out, then the four corners. It
// takes the first that is inside the plot, clear of every name already placed and of both typical lines (3px either
// side), at least 4px clear of every other dot, and nearer its own dot than any other by 3px, so a name never reads as
// a neighbour's. A name with no such place may then lie across a typical line (its card-coloured backing breaks the
// dashes, so the line never strikes through the word), and one that still fits nowhere is left off: the page says so
// under the chart, and the tooltip and the table name that dot. The extremes are placed first, then the visitor's own
// broker (the one the calculator and Home remember), then the dots with the most room; on a phone only the extremes and
// that broker are named (every dot when there are four or fewer). Pointing at a dot that hides others names them all.
// The page passes the width it measured, and the axes' ranges, ticks and margins are fixed here, so a name is drawn
// exactly where it was tested. The tick steps are ECharts' own nice steps (charts/axis.ts), chosen so the values fill
// the axis as far as the labels leave room; the first x label never meets the y axis's lowest in the corner (MARGIN),
// and the last one sits inside the chart (the right margin holds its half).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { axisRange, textWidth } from "../../charts/axis";
import type { Option } from "../../charts/EChart";
import { base, label, tip, tooltip, valueAxis } from "../../charts/kit";
import { andList } from "../../lib/broker";
import type { Tokens } from "../../lib/theme";

export interface Dot { id: string; name: string; x: number; y: number; rows: [string | null, string, string][] }
interface Axis { name: string; short: string; fmt: (v: number) => string }
interface Box { x: number; y: number; w: number; h: number }

/** The chart's height (px): the page holds this much room while the chart library loads. */
export const PLOT_H = 440;
/** Below this width (a phone, a narrow tablet) only the extremes are named and the axis titles take their short form. */
export const NARROW = 520;

const SYMBOL = 12; // a dot's diameter; its 2px card-coloured ring adds 1px all round
const RING = SYMBOL / 2 + 1;
const MARGIN = 10; // tick labels to the plot's edge: clear of a dot on the edge, and of each other in the corner
const PAD: [number, number] = [2, 3]; // a name's backing round the word
/** How a name may sit, strictest first: clear of both typical lines, at least 4px from any other broker's dot and 3px
 *  nearer its own; then 2px and 2px; then the same two across a typical line (on its card-coloured backing). */
interface Rule { overLine: boolean; apart: number; nearer: number }
const RULES: Rule[] = [
  { overLine: false, apart: 4, nearer: 3 }, { overLine: false, apart: 2, nearer: 2 },
  { overLine: true, apart: 4, nearer: 3 }, { overLine: true, apart: 2, nearer: 2 },
];

const hit = (a: Box, b: Box, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
/** From a point to the nearest point of a box (0 inside it). */
const reach = (px: number, py: number, b: Box) =>
  Math.hypot(Math.max(b.x - px, 0, px - (b.x + b.w)), Math.max(b.y - py, 0, py - (b.y + b.h)));

export function scatterOption(t: Tokens, dots: Dot[], o: {
  x: Axis; y: Axis; typical: [number, number];
  /** the chart's width as the page measured it */
  width: number;
  /** the visitor's own broker, named after the extremes (and on a phone too), when the browser remembers one */
  mine?: string | null;
}): { option: Option; unnamed: number } {
  const W = o.width, H = PLOT_H, fs = label();
  const lh = Math.ceil(fs * 1.25); // a line of chart text as the SVG boxes it (17px at 14px)
  const narrow = W < NARROW;
  const xName = narrow ? o.x.short : o.x.name, yName = narrow ? o.y.short : o.y.name;
  const widest = (ticks: number[], fmt: (v: number) => string) => Math.ceil(Math.max(...ticks.map((v) => textWidth(fmt(v), fs))));

  // ---- the frame: the y axis first (its tick labels set the left margin), then the x axis across what is left, in as
  // many steps as its labels have room for side by side
  const top = 12, bottom = MARGIN + lh + 8 + lh + 2;
  const plotH = H - top - bottom;
  const xs = dots.map((d) => d.x), ys = dots.map((d) => d.y);
  const yr = axisRange(Math.min(...ys, o.typical[1]), Math.max(...ys, o.typical[1]), 7, plotH, () => lh + 8);
  const yGap = widest(yr.ticks, o.y.fmt) + MARGIN + 12; // from the plot's edge to the y axis title
  const left = yGap + lh + 2;
  const room = W - left - (narrow ? 8 : 16);
  const xr = axisRange(Math.min(...xs, o.typical[0]), Math.max(...xs, o.typical[0]), narrow ? 4 : 7, room,
    (ticks) => widest(ticks, o.x.fmt) + 16);
  // the last tick label is centred on the plot's right edge: the margin holds its right half
  const right = Math.max(narrow ? 8 : 16, Math.ceil(textWidth(o.x.fmt(xr.max), fs) / 2) + 4);
  const plotW = W - left - right;
  const X = (v: number) => left + ((v - xr.min) / (xr.max - xr.min)) * plotW;
  const Y = (v: number) => top + ((yr.max - v) / (yr.max - yr.min)) * plotH;
  const plotBottom = top + plotH, tx = X(o.typical[0]), ty = Y(o.typical[1]);

  // ---- the names: each a box of its word and backing, tested round its dot
  const h = fs + 2 * PAD[0];
  const at = dots.map((d) => ({ cx: X(d.x), cy: Y(d.y), w: Math.ceil(textWidth(d.name, fs)) + 2 * PAD[1] }));
  // the extremes: the lowest and highest on each measure, when one broker holds it alone
  const ends = new Set<number>();
  for (const v of [(d: Dot) => d.y, (d: Dot) => -d.y, (d: Dot) => d.x, (d: Dot) => -d.x]) {
    const best = Math.min(...dots.map(v));
    const who = dots.flatMap((d, i) => (v(d) === best ? [i] : []));
    if (who.length === 1) ends.add(who[0]);
  }
  const mine = o.mine ? dots.findIndex((d) => d.id === o.mine) : -1;
  // then the dots with the most room round them first, so a crowd gives up as few names as it can
  const near = at.map((a, i) => Math.min(Infinity, ...at.filter((_, j) => j !== i).map((b) => Math.hypot(a.cx - b.cx, a.cy - b.cy))));
  const order = [...ends, ...(mine >= 0 && !ends.has(mine) ? [mine] : []),
    ...dots.map((_, i) => i).filter((i) => !ends.has(i) && i !== mine).sort((i, j) => near[j] - near[i])]
    // a phone names only the extremes and the visitor's own broker, unless there are too few dots to crowd it
    .filter((i) => !narrow || dots.length <= 4 || ends.has(i) || i === mine);
  const dotBoxes = at.map(({ cx, cy }) => ({ x: cx - RING - 1, y: cy - RING - 1, w: 2 * RING + 2, h: 2 * RING + 2 }));
  const placed: Box[] = [];
  const spot: (Box | null)[] = dots.map(() => null);
  const crosses = (b: Box) => (b.x - 3 < tx && tx < b.x + b.w + 3 && b.y < plotBottom && b.y + b.h > top)
    || (b.y - 3 < ty && ty < b.y + b.h + 3 && b.x < left + plotW && b.x + b.w > left);
  const x0 = left + 2, x1 = W - 1; // the names' side limits: clear of the y tick labels, inside the chart
  const fits = (i: number, b: Box, rule: Rule) => {
    if (b.x < x0 || b.x + b.w > x1 || b.y < 2 || b.y + b.h > plotBottom + 6) return false;
    if (dotBoxes.some((d, j) => hit(b, d, j === i ? 0 : rule.apart))) return false;
    if (placed.some((p) => hit(b, p, 3))) return false;
    if (!rule.overLine && crosses(b)) return false;
    // nearer its own dot than any other, so it never reads as a neighbour's name
    const own = reach(at[i].cx, at[i].cy, b) + rule.nearer;
    return at.every((a, j) => j === i || reach(a.cx, a.cy, b) >= own);
  };
  const places = (i: number): [number, number][] => {
    const { cx, cy, w } = at[i], side = RING + 2, up = RING + 1;
    // above and below: centred on the dot, then slid along it either way, the word always spanning the dot; the first
    // try slides inward at a side of the chart
    const span = (x: number) => Math.min(Math.max(x, cx - w + 4), cx - 4);
    const mid = Math.min(Math.max(cx - w / 2, x0, cx - w + 4), x1 - w, cx - 4);
    const slides = [...new Set([mid, ...[-0.25, 0.25, -0.5, 0.5].map((f) => span(cx - w / 2 + f * w))])];
    return [
      [cx + side, cy - h / 2], [cx - side - w, cy - h / 2], // right, left
      [mid, cy - up - h], [mid, cy + up], // above, below
      ...slides.slice(1).flatMap((x): [number, number][] => [[x, cy - up - h], [x, cy + up]]),
      ...[6, 12].flatMap((d): [number, number][] => [[cx + side + d, cy - h / 2], [cx - side - d - w, cy - h / 2]]),
      [cx + 2, cy - up - h], [cx - 2 - w, cy - up - h], [cx + 2, cy + up], [cx - 2 - w, cy + up], // the corners
    ];
  };
  for (const rule of RULES) {
    for (const i of order) {
      if (spot[i]) continue;
      for (const [x, y] of places(i)) {
        const b = { x, y, w: at[i].w, h };
        if (fits(i, b, rule)) { placed.push(b); spot[i] = b; break; }
      }
    }
  }

  // ---- pointing at a dot that hides others (a ring over their centres) names them all, each with the two figures
  const under = at.map((a, i) => at.flatMap((b, j) => (j !== i && Math.hypot(a.cx - b.cx, a.cy - b.cy) <= RING ? [j] : [])));
  const say = (i: number) => {
    if (!under[i].length) return tip(dots[i].name, dots[i].rows);
    // brokers with the same two figures share one block: "eToro and Cash App"
    const groups = new Map<string, number[]>();
    for (const k of [i, ...under[i]]) {
      const key = dots[k].rows.slice(0, 2).map((r) => r[2]).join("|");
      groups.set(key, [...(groups.get(key) ?? []), k]);
    }
    return [...groups.values()].map((ks, n) =>
      `<div${n ? ' style="margin-top:10px"' : ""}>${tip(andList(ks.map((k) => dots[k].name)), dots[ks[0]].rows.slice(0, 2))}</div>`).join("");
  };

  return {
    unnamed: spot.filter((b) => !b).length,
    option: {
      ...base(t),
      grid: { left, right, top, bottom, containLabel: false },
      xAxis: valueAxis(t, {
        name: xName, nameLocation: "middle", nameGap: MARGIN + lh + 8, min: xr.min, max: xr.max, interval: xr.step,
        axisLabel: { formatter: o.x.fmt, margin: MARGIN, hideOverlap: true },
      }),
      yAxis: valueAxis(t, {
        name: yName, nameLocation: "middle", nameGap: yGap, min: yr.min, max: yr.max, interval: yr.step,
        axisLabel: { formatter: o.y.fmt, margin: MARGIN },
      }),
      tooltip: tooltip(t, { trigger: "item", formatter: (p: any) => say(p.dataIndex) }),
      series: [{
        type: "scatter",
        // over the typical lines (a mark line draws at z 5 whatever its series says), so a name's backing hides them
        z: 6,
        symbolSize: SYMBOL,
        // a name without a place stays off
        data: dots.map((d, i) => ({ value: [d.x, d.y], name: d.name, id: d.id, label: { show: spot[i] != null } })),
        itemStyle: { color: t.ink, borderColor: t.surface, borderWidth: 2, opacity: 1 },
        label: {
          show: true, position: "inside", align: "left", verticalAlign: "middle", formatter: (p: any) => p.data.name,
          color: t.ink2, fontSize: fs, textBorderWidth: 0, backgroundColor: t.surface, padding: PAD, borderRadius: 3,
        },
        // each name moved from the centre of its dot to the place it was tested at (ECharts takes a label's offset from
        // here once a layout is set); hiding overlaps is only a safety net, since the places never overlap
        labelLayout: (p: any) => {
          const b = spot[p.dataIndex], a = at[p.dataIndex];
          return b ? { dx: b.x - a.cx, dy: b.y + h / 2 - a.cy, hideOverlap: true } : { hideOverlap: true };
        },
        // a pointed-at dot grows and its name turns ink, at the weight it was placed at (a bolder word would be wider)
        emphasis: { scale: 1.3, label: { color: t.ink } },
        // the typical lines under the names: a name lying across one hides the dashes behind its backing
        markLine: {
          silent: true, symbol: "none",
          lineStyle: { color: t.mark, type: "dashed", width: 1 },
          label: { show: false },
          data: [{ xAxis: o.typical[0] }, { yAxis: o.typical[1] }],
        },
      }],
    },
  };
}
