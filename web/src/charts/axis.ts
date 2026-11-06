// What the page's own chart layouts share (the explorer's scatter, the calculator's ranked bars): text measured in the
// charts' face, and a value axis at ECharts' own nice steps (1, 2, 3, 5 times a power of ten) chosen for the width the page
// measured, so the tick labels keep their room instead of running together. Pure but for the canvas that measures text.
import { FONT } from "./kit";

let ctx: CanvasRenderingContext2D | null | undefined;
/** A text's width in the charts' face at `px` and `weight`: the canvas measures it as the SVG draws it (an estimate on the
 *  server). */
export function textWidth(s: string, px: number, weight = 400): number {
  if (ctx === undefined) ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!ctx) return s.length * px * (weight >= 600 ? 0.66 : 0.62);
  ctx.font = `${weight} ${px}px ${FONT}`;
  return ctx.measureText(s).width;
}

/** A tick step of 1, 2, 3 or 5 times a power of ten near `raw` (ECharts' own "nice" steps). */
function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 2.5 ? 2 : f < 4 ? 3 : f < 7 ? 5 : 10) * p;
}
/** The next coarser nice step: 1 → 2 → 3 → 5 → 10. */
function coarser(step: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(step) + 1e-9));
  const f = Math.round(step / p);
  return (f < 2 ? 2 : f < 3 ? 3 : f < 5 ? 5 : 10) * p;
}

export interface Range { min: number; max: number; step: number; ticks: number[] }
function finish(min: number, max: number, step: number): Range {
  const dec = Math.max(0, Math.ceil(-Math.log10(step)) + 1);
  const r = (v: number) => +v.toFixed(dec);
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(r(v));
  return { min: r(min), max: r(max), step: r(step), ticks };
}

/** An axis from a multiple of the step at or below the lowest value to one at or above the highest. Of the nice steps
 *  that make at most `parts` intervals, each at least `room(ticks)` px apart (its labels side by side), the one whose
 *  range the values fill most; then (with `edges`) a step more at an end where a mark would sit on the edge (never across
 *  zero for values that don't cross it). Every value is rounded to the step's decimals, as ECharts rounds its ticks. */
export function axisRange(lo: number, hi: number, parts: number, len: number, room: (ticks: number[]) => number, edges = true): Range {
  if (!(hi > lo)) {
    // one value for everyone (every commission $0.00): the span ECharts would draw, the value at its start or middle
    const a = Math.abs(lo);
    return lo === 0 ? axisRange(0, 1, parts, len, room, false) : axisRange(lo - a / 2, lo + a / 2, parts, len, room, false);
  }
  let best: Range | null = null, share = -1, few: Range | null = null;
  for (let step = niceStep((hi - lo) / (parts * 2)), k = 0; k < 12; step = coarser(step), k++) {
    const r = finish(Math.floor(lo / step) * step, Math.ceil(hi / step) * step, step);
    const n = r.ticks.length - 1;
    if (n <= 2 && !few) few = r; // where nothing has room: the first step that leaves two intervals or fewer
    if (n > parts || len / n < room(r.ticks)) continue;
    const s = (hi - lo) / (r.max - r.min);
    if (s > share + 1e-9) { best = r; share = s; }
  }
  let { min, max, step } = (best ?? few)!;
  const px = (v: number) => ((v - min) / (max - min)) * len, edge = 4;
  if (edges && px(lo) < edge && !(lo >= 0 && min - step < 0)) min -= step;
  if (edges && len - px(hi) < edge && !(hi <= 0 && max + step > 0)) max += step;
  return finish(min, max, step);
}
