// The All firms page's numbers: every firm that files a monthly SEC Rule 605 price report, what its customers paid for
// the orders picked (as a share of the spread), and the four rails of the overview on one shared axis. Pure (no window,
// no React), so the pre-render and the browser draw the same page.
import { execKey, type Data, type Filters } from "../../lib/data";
import { titleCase } from "../../lib/format";
import { median } from "../../lib/stats";

/** 0 on this site · 1 other brokers · 2 trading firms · 3 exchanges and other trading venues */
export type GroupIx = 0 | 1 | 2 | 3;

export const GROUPS: { row: string; pill: string; noun: string }[] = [
  { row: "On this site", pill: "On this site", noun: "firms on this site" },
  { row: "Other brokers", pill: "Other brokers", noun: "other brokers" },
  { row: "Trading firms", pill: "Trading firms", noun: "trading firms" },
  { row: "Exchanges and other venues", pill: "Exchanges & venues", noun: "exchanges and venues" },
];

export interface FirmRow {
  id: string;
  name: string;
  /** FINRA's category for the report (Broker-Dealer, OTC Market Maker, Exchange, …) */
  cat: string;
  g: GroupIx;
  /** the firm's page here (brokers/<slug>/), null when it has none */
  slug: string | null;
  /** share of the quoted spread the customer paid, in percent; null when the report has no such orders */
  cust: number | null;
  /** share of orders filled better than the quote, in percent */
  pi: number | null;
  /** average order, dollars */
  sz: number | null;
}

/** FINRA lists most names in capitals: title case them, keeping short letter runs without a vowel (PNC, HRT, GTS) and "US"
 *  in capitals. An exchange listed by its market code alone (XNYS) keeps it as it is. */
function display(id: string, name: string): string {
  if (name === id) return name;
  const t = titleCase(name);
  if (t === name) return name;
  return t.replace(/\b[A-Z][a-z]{1,3}\b/g, (w) => (/^[B-DF-HJ-NP-TV-XZ][b-df-hj-np-tv-xz]+$/.test(w) || w === "Us" ? w.toUpperCase() : w));
}

export const groupOf = (d: Data, id: string, cat: string): GroupIx =>
  d.byId[id] ? 0 : cat === "Broker-Dealer" ? 1 : /Market Maker/.test(cat) ? 2 : 3;

/** One row per firm that reports, under the filters picked (stock group, order type, order size, month). */
export function firmRows(d: Data, f: Filters): FirmRow[] {
  return Object.entries(d.reporters).map(([id, r]) => {
    const e = d.exec.get(execKey(id, f.month, f.sp, f.ot, f.b));
    const own = d.byId[id];
    return {
      id, name: own?.short ?? display(id, r.name), cat: r.cat, g: groupOf(d, id, r.cat), slug: own?.slug ?? null,
      cust: e?.efq == null ? null : e.efq * 100, pi: e?.pi == null ? null : e.pi * 100, sz: e?.sz ?? null,
    };
  });
}

/** A share of the spread: "−16.6%", "30.8%", "4,205.3%" (a proper minus, never "−0.0%"). */
export function share(v: number): string {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${v < 0 && s !== "0.0" ? "−" : ""}${s}%`;
}

/* ---------- the overview: four rails on one axis ---------- */

/** Firms whose customers paid beyond these shares of the spread are left off the rails (and named under them): one firm
 *  far out would squeeze every other dot into a corner. 150% is half a spread past the quoted price. */
export const CLIP = { lo: -50, hi: 150 };
/** The narrowest rail of each layout (firms.css): a 320px phone, a 600px tablet, a 1024px desktop (with the label column).
 *  Dots that would touch at that width stack into lanes, so they never overlap at any width of the layout. */
export const TIERS = [248, 488, 712] as const;
/** px between two dots' centres in one lane: the 10px dot and a 1px gap (firms.css draws the same sizes) */
const GAP = 11;

export interface Dot { id: string; name: string; v: number; on: boolean; x: number; lanes: [number, number, number] }
export interface Rail {
  g: GroupIx;
  /** firms in the group with a figure (drawn or not) */
  n: number;
  dots: Dot[];
  /** the group's typical firm (the median of all its figures), null without any */
  typ: number | null;
  /** its place on the axis, in percent, kept on the rail */
  typX: number | null;
  /** the deepest lane in each layout */
  depth: [number, number, number];
  /** cheapest and dearest firms of the group (for the screen-reader line) */
  lo: FirmRow | null;
  hi: FirmRow | null;
}
export interface Field {
  lo: number; hi: number;
  ticks: { v: number; x: number; major: boolean }[];
  rails: Rail[];
  /** firms beyond CLIP, left off the rails */
  cut: FirmRow[];
  /** firms with a figure for these orders */
  reported: number;
}

/** The lowest lane each value fits in (values ascending, `gap` in axis units): first fit, so a crowd stacks upward. */
function lanesOf(vs: number[], gap: number): number[] {
  const ends: number[] = [];
  return vs.map((v) => {
    let k = ends.findIndex((e) => v - e >= gap);
    if (k < 0) { k = ends.length; ends.push(v); } else ends[k] = v;
    return k;
  });
}

const inClip = (v: number | null): v is number => v != null && v >= CLIP.lo && v <= CLIP.hi;

/** The rails for `rows`, on an axis wide enough for every figure in `scale` (default: the rows themselves). The page passes
 *  both stock groups and every month of the same order type and size, so the axis holds still when those change and a
 *  dot's glide is its own figure changing, never the axis being redrawn. */
export function fieldOf(rows: FirmRow[], scale: FirmRow[] = rows): Field {
  const has = rows.filter((r) => r.cust != null);
  const drawn = has.filter((r) => inClip(r.cust));
  const vs = scale.map((r) => r.cust).filter(inClip);
  // the axis: 0% (the fair price) always in view, a little room past the extremes, gridlines at round steps
  const lo = Math.min(-10, Math.floor(Math.min(0, ...vs) / 10) * 10);
  const hi = Math.max(lo + 60, Math.ceil(Math.max(0, ...vs) / 10) * 10);
  const span = hi - lo;
  const step = span <= 180 ? 25 : span <= 360 ? 50 : 100;
  const at = (v: number) => ((v - lo) / span) * 100;
  const ticks: Field["ticks"] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push({ v, x: at(v), major: v % (2 * step) === 0 });

  const rails = ([0, 1, 2, 3] as GroupIx[]).map((g): Rail => {
    const all = has.filter((r) => r.g === g).sort((a, b) => a.cust! - b.cust! || a.name.localeCompare(b.name));
    const mine = drawn.filter((r) => r.g === g).sort((a, b) => a.cust! - b.cust! || a.name.localeCompare(b.name));
    const lanes = TIERS.map((px) => lanesOf(mine.map((r) => r.cust!), (GAP / px) * span));
    const typ = median(all.map((r) => r.cust!));
    return {
      g, n: all.length,
      // in a fixed order (by firm), never by value: React moves a reordered element in the DOM, and a moved element jumps
      // to its new place instead of gliding there
      dots: mine.map((r, i): Dot => ({ id: r.id, name: r.name, v: r.cust!, on: g === 0, x: at(r.cust!), lanes: [lanes[0][i], lanes[1][i], lanes[2][i]] }))
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
      typ, typX: typ == null ? null : Math.min(100, Math.max(0, at(typ))),
      depth: [0, 1, 2].map((t) => Math.max(0, ...lanes[t])) as [number, number, number],
      lo: all[0] ?? null, hi: all[all.length - 1] ?? null,
    };
  });
  return { lo, hi, ticks, rails, cut: has.filter((r) => !drawn.includes(r)), reported: has.length };
}
