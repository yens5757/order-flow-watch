// The numbers and sentences of a broker page, generated from the data. Pure (no window, no React), so the pre-render
// and the browser compute the same page, and other pages (Home, the search descriptions in routes.ts) can agree with it.
// One ranking measure everywhere: dollars paid above the fair price per $10,000 traded (Metric.cost10k).
import { annualCost, type CostInputs, type CostLine } from "./cost";
import { brokerRows, files606, metric, type Data, type Filters, type Firm, type Metric, type Sp } from "./data";
import { monthLong, ordinal, quarterLong, usd2 } from "./format";
import { median } from "./stats";

/** The broker page's filters, whatever the visitor last picked on other pages: market orders, all sizes under $200,000
 *  averaged, the latest month and the latest payment quarter (metric() falls back a quarter for a late filer). */
export const pageFilters = (d: Data, sp: Sp, month: string = d.meta.month): Filters =>
  ({ sp, ot: "M", b: 199999, month, quarter: d.meta.quarter, clearing: false });

/** Whole cents, rounded half away from zero like the price shown (toFixed), so "the same price" means the same figure on
 *  screen (and −0 counts as 0). */
export const cents = (v: number) => Math.sign(v) * Math.round(Math.abs(v) * 100) || 0;
/** Dollars as shown in cents: −$0.09, $0.82, $0.00 (never "−$0.00"). */
export const money = (v: number) => usd2(cents(v) / 100);

/** A price per $10,000 against the fair price as the plain pages show it, on the whole cents shown: "$0.82", or "$0.09"
 *  and the word "below" rather than a minus sign, so no "−$0.09" sits beside "above the fair price" (tables, scale
 *  captions, the gap line's brackets). The explorer keeps the sign. */
export function fairParts(v: number): { amt: string; below: boolean } {
  return { amt: money(Math.abs(v)), below: cents(v) < 0 };
}
/** fairParts as one string: "$0.82", "$0.09 below" (a no-break space: a narrow scale caption wraps before the figure,
 *  never between it and its word). */
export const fairText = (v: number) => {
  const { amt, below } = fairParts(v);
  return below ? `${amt}${String.fromCharCode(0xa0)}below` : amt;
};

/* ---------- where a broker ranks ---------- */

export interface Place {
  m: Metric;
  /** competition rank on the shown cents: brokers showing the same price share a rank (1, 2, 2, 4) */
  rank: number;
  tied: boolean;
}

/** Every retail broker with a price for this stock group and month, cheapest first. */
export function placeBrokers(d: Data, sp: Sp, month: string = d.meta.month): Place[] {
  const rows = brokerRows(d, pageFilters(d, sp, month)).filter((r) => r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!);
  const c = rows.map((r) => cents(r.cost10k!)); // sorted by value, so the cents never go down
  return rows.map((m, i) => ({ m, rank: c.indexOf(c[i]) + 1, tied: c.filter((x) => x === c[i]).length > 1 }));
}

/** "10th cheapest of 25", "the cheapest of 25", "the most expensive of 25", "tied 9th cheapest of 25". */
export function rankWords(places: Place[], p: Place): string {
  const n = places.length, c = cents(p.m.cost10k!);
  if (n < 2) return "the only broker with a price";
  if (c === cents(places[0].m.cost10k!)) return p.tied ? `tied cheapest of ${n}` : `the cheapest of ${n}`;
  if (c === cents(places[n - 1].m.cost10k!)) return p.tied ? `tied most expensive of ${n}` : `the most expensive of ${n}`;
  return `${p.tied ? "tied " : ""}${ordinal(p.rank)} cheapest of ${n}`;
}

/** Which third of the ranking a rank falls in: of 25, ranks 1–8 cheapest, 9–17 the middle, 18–25 most expensive. */
export type Third = "cheapest" | "middle" | "dearest";
export function third(rank: number, n: number): Third {
  const p = n > 1 ? (rank - 1) / (n - 1) : 0.5;
  return p < 1 / 3 ? "cheapest" : p > 2 / 3 ? "dearest" : "middle";
}

/** A rank in words, read from the rank as shown, so the answer card's sentence can never contradict its rank lines: the
 *  first, the top third, the middle third, the bottom third, the last. Of 25: 1 first, 2–8 top, 9–17 middle, 18–24
 *  bottom, 25 last. A broker level with another at an end takes the third it opens ("tied cheapest" is "among the
 *  cheapest", never "the cheapest"). */
export type Grade = "first" | "top" | "middle" | "bottom" | "last";
export function gradeOf(rank: number, n: number, tied: boolean): Grade {
  if (!tied && rank === 1) return "first";
  if (!tied && rank === n) return "last";
  const t = third(rank, n);
  return t === "cheapest" ? "top" : t === "dearest" ? "bottom" : "middle";
}

/* ---------- the same stocks and order sizes ---------- */

/** Points of the spread past which the best and worst brokers' same-stock gaps count as different (Home's first finding). */
export const SAME_STOCK_MARGIN = 3;

/** The same-stock figure as the site shows it (Metric.gap, points of the spread to one decimal), in whole tenths. */
const tenths = (v: number) => Math.round(v * 10) || 0;

export interface SamePlace { id: string; gap: number; rank: number; tied: boolean }

/** Every retail broker with a same-stock figure for this stock group (Metric.gap's rule: at least 100 matching stock ×
 *  lot × size cells), best first: the lowest gap, whose customers paid least against other brokers' customers on the same
 *  stocks and order sizes. Ranked on the figure as shown, so brokers showing the same figure share a rank (1, 2, 2, 4),
 *  as on the price card. */
export function placeSameStock(d: Data, sp: Sp): SamePlace[] {
  const rows = d.sameStock.brokers
    .filter((g) => g.sp === sp && g.cells >= 100 && d.byId[g.id]?.type === "broker")
    .sort((a, b) => a.gap - b.gap);
  const t = rows.map((g) => tenths(g.gap)); // sorted by value, so the tenths never go down
  return rows.map((g, i) => ({ id: g.id, gap: g.gap, rank: t.indexOf(t[i]) + 1, tied: t.filter((x) => x === t[i]).length > 1 }));
}

/** The same-stock verdict, graded by rank like the price, never by a margin around zero (a 3-point margin once called 19 of
 *  25 brokers "worse than most"). Home's answer card and the broker pages read it through the price card's sentence. */
export const sameStockVerdict = (rank: number, n: number, tied: boolean): Grade => gradeOf(rank, n, tied);

export interface SameRank {
  rank: number;
  /** how many brokers have a figure: the line's real denominator */
  n: number;
  tied: boolean;
  grade: Grade;
}

/** Where a broker ranks on the same stocks and order sizes; null for a broker without a figure (too few of its trades
 *  match other brokers') or with no other broker to rank against. */
export function sameStockRank(d: Data, id: string, sp: Sp): SameRank | null {
  const places = placeSameStock(d, sp);
  const p = places.find((x) => x.id === id);
  if (!p || places.length < 2) return null;
  return { rank: p.rank, n: places.length, tied: p.tied, grade: sameStockVerdict(p.rank, places.length, p.tied) };
}

/** The answer card's same-stock line, numbers first: "13th of 25", "1st of 25", "tied 9th of 25" (then "on the same
 *  stocks and order sizes"). Plain ordinals, so it reads beside the price rank without a score's words. */
export const sameStockWords = (s: SameRank) => `${s.tied ? "tied " : ""}${ordinal(s.rank)} of ${s.n}`;

/** The line behind the same-stock line's (i), in plain words (the points of the spread stay on How we measure): what the
 *  comparison holds equal, the pool when fewer brokers have a figure than a price, the source and month. */
export function sameStockNote(d: Data, s: SameRank, priced: number): string {
  const pool = s.n < priced ? ` ${s.n} of the ${priced} brokers had enough matching trades.` : "";
  return `Each broker's customers compared with other brokers' customers on the same stocks and order sizes, so what they `
    + `happen to trade doesn't count.${pool} From the detailed SEC Rule 605 reports: market orders under $200,000, ${monthLong(d.meta.detailMonth)}.`;
}

const PRICE_WORDS: Record<Grade, string> = {
  first: "the cheapest", top: "among the cheapest", middle: "near the middle", bottom: "among the most expensive", last: "the most expensive",
};
const SAME_WORDS: Record<Grade, string> = {
  first: "the best", top: "better than most", middle: "near the middle", bottom: "worse than most", last: "the worst",
};
const tone = (g: Grade) => (g === "first" || g === "top" ? 1 : g === "middle" ? 0 : -1);

/** The answer card's one sentence, graded by the two ranks right above it so it can't contradict them: on average (the
 *  figure and its rank), then on the same stocks and order sizes. Said once when both fall in the same place ("near the
 *  middle either way": the two rank lines name the ways); "but" when they point different ways (a broker can look cheap
 *  because of what its customers trade). `same` null: no same-stock rank, and `unmatched` says it is because too few of
 *  its trades match other brokers'. */
export function priceSentence(short: string, price: Grade, same: Grade | null, unmatched = false): string {
  const on = "on the same stocks and order sizes";
  if (same == null) {
    return unmatched
      ? `${short} is ${PRICE_WORDS[price]} on average; too few of its trades match other brokers' to compare them ${on}.`
      : `${short} is ${PRICE_WORDS[price]} on average.`;
  }
  if (same === price) return `${short} is ${PRICE_WORDS[price]} either way.`;
  return `${short} is ${PRICE_WORDS[price]} on average${tone(price) === tone(same) ? " and" : ", but"} ${SAME_WORDS[same]} ${on}.`;
}

/* ---------- what the broker is paid ---------- */

/** The exchanges among the venues a 606 lists. Every other venue that fills orders is a trading firm (a market maker or
 *  another broker-dealer); an exchange charges or rebates access fees, it doesn't buy order flow. */
const EXCHANGE = /^(nasdaq|nyse|cboe|memx|iex|miax|ltse|american stock exchange)\b/i;
export const isExchange = (venue: string) => EXCHANGE.test(venue);

/** paid: trading firms pay it · zero: it is paid nothing · pays: it pays the trading firm that fills its orders (Cash App →
 *  Virtu) · fees: no trading firm pays it, and what it pays is exchange access fees (IBKR, J.P. Morgan) · missing: it files a
 *  payment report (Rule 606) but this quarter's has no rate for these orders · none: it files no report of its own. */
export type PayKind = "paid" | "zero" | "pays" | "fees" | "missing" | "none";
export interface Pay {
  kind: PayKind;
  /** dollars per $10,000 of orders; null when this month's price report is missing (so no share price to convert with) */
  v: number | null;
  /** cents per 100 shares, the 606's own unit */
  cph: number | null;
  quarter: string | null;
  fallback: boolean;
}

export function payment(d: Data, m: Metric, sp: Sp, ot: "M" | "ML" = "M"): Pay {
  // a CRD alone is not a payment report: five brokers have one without filing (files606 in data.ts)
  if (!files606(d, m.f.crd)) return { kind: "none", v: null, cph: null, quarter: null, fallback: false };
  if (m.cph == null) return { kind: "missing", v: null, cph: null, quarter: d.meta.quarter, fallback: false };
  // the sign as shown: whole cents per $10,000, or tenths of a cent per 100 shares when there is no price to convert with
  const sign = m.pay10k != null ? Math.sign(cents(m.pay10k)) : Math.sign(Math.round(m.cph * 10));
  // money out goes to a trading firm only when a trading firm's own rate is below zero; otherwise it is exchange fees
  const toFirm = d.venues.some((x) => x.crd === m.f.crd && x.q === m.payQ && x.sp === sp && (x.share[ot] ?? 0) > 0
    && (x.cph[ot] ?? 0) < 0 && !isExchange(x.venue));
  const kind: PayKind = sign > 0 ? "paid" : sign === 0 ? "zero" : toFirm ? "pays" : "fees";
  return { kind, v: m.pay10k, cph: m.cph, quarter: m.payQ, fallback: m.payQ != null && m.payQ !== d.meta.quarter };
}

/** The amount, ready for a sentence: "$0.83 per $10,000", or "34.8¢ per 100 shares" without this month's prices. */
export const payAmount = (p: Pay) => (p.v != null ? `${money(Math.abs(p.v))} per $10,000` : `${Math.abs(p.cph ?? 0).toFixed(1)}¢ per 100 shares`);

/* ---------- a typical year ---------- */

/** The year a broker page prices: 24 trades of $2,000, half S&P 500 and half other stocks; trade prices and commissions
 *  only. Options, idle cash and margin are left to the calculator, which asks. */
export const HABIT: CostInputs = { trades: 24, size: 2000, spMix: 50, options: 0, idleCash: 0, margin: 0 };

export interface Year {
  /** this broker's year, null without price data */
  line: CostLine | null;
  /** every broker whose year is complete for this habit (both price groups and the commission), cheapest first: the only ones ranked */
  complete: CostLine[];
  /** rank among `complete` on the shown cents, null when this broker's year is incomplete */
  rank: number | null;
  tied: boolean;
}

export function yearFor(d: Data, id: string): Year {
  const lines = annualCost(d, HABIT);
  const complete = lines.filter((l) => l.missing.length === 0).sort((a, b) => a.total - b.total);
  const line = lines.find((l) => l.id === id) ?? null;
  const i = line ? complete.indexOf(line) : -1;
  if (i < 0) return { line, complete, rank: null, tied: false };
  const c = complete.map((l) => cents(l.total));
  return { line, complete, rank: c.indexOf(c[i]) + 1, tied: c.filter((x) => x === c[i]).length > 1 };
}

/** Yearly dollars as the yearly card shows them: cents under $100 ($9.80, −$0.22), whole dollars from there ($1,250). */
export const yearly = (v: number) =>
  (Math.abs(v) < 0.005 ? "$0" : Math.abs(v) < 100 ? usd2(v) : `${v < 0 ? "−" : ""}$${Math.round(Math.abs(v)).toLocaleString("en-US")}`);

/** "About $9 a year"; "At least $9.80 a year" when a part is missing (the part counted, as its row shows it, never rounded
 *  up to the next dollar); "About $3 ahead a year" when prices beat the fair price. */
export function yearHeadline(l: CostLine): string {
  if (l.missing.length) {
    const known = l.total <= 0 ? "$0" : l.total < 100 ? usd2(l.total) : `$${Math.floor(l.total).toLocaleString("en-US")}`;
    return `At least ${known} a year`;
  }
  const r = Math.round(l.total) || 0;
  const amount = `$${Math.abs(r).toLocaleString("en-US")}`;
  return r < 0 ? `About ${amount} ahead a year` : `About ${amount} a year`;
}

/** Who the yearly rank is among: the habit counts trade prices and commissions only, so a broker is ranked once both its
 *  price groups are reported and its commission is confirmed (every broker has prices today). */
export const yearPool = (n: number) => `the ${n} brokers whose commission is confirmed`;

/** "11th cheapest of the 20 brokers whose commission is confirmed" (the cheapest, the most expensive, ties as on the price card). */
export function yearRankWords(y: Year): string | null {
  if (y.rank == null || !y.line) return null;
  const n = y.complete.length, c = cents(y.line.total);
  const of = `of ${yearPool(n)}`;
  if (c === cents(y.complete[0].total)) return `${y.tied ? "Tied cheapest" : "The cheapest"} ${of}`;
  if (c === cents(y.complete[n - 1].total)) return `${y.tied ? "Tied most expensive" : "The most expensive"} ${of}`;
  return `${y.tied ? "Tied " : ""}${ordinal(y.rank)} cheapest ${of}`;
}

/* ---------- the price scale ---------- */

export interface ScalePoint { name: string; v: number }
/** The neutral scale a broker is placed on: cheapest · this broker · typical (the median) · most expensive. `marks` are
 *  more named dots of the same weight as `you` (Compare's two brokers, for instance); components/broker/Scale.tsx places
 *  every one at its true position. */
export interface ScaleData { lo: ScalePoint; hi: ScalePoint; typ: number; you: ScalePoint | null; marks?: ScalePoint[] }

/** The scale of `points` (every broker), with `you` and any further `marks` placed on it. */
export function scaleOf(points: ScalePoint[], you: ScalePoint | null, marks?: ScalePoint[]): ScaleData | null {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a.v - b.v);
  return { lo: sorted[0], hi: sorted[sorted.length - 1], typ: median(sorted.map((p) => p.v)) ?? sorted[0].v, you, ...(marks?.length ? { marks } : {}) };
}

/** Each mark's true position along the scale, in percent of its width. A broker outside the ends (a clearing firm
 *  priced past every broker) widens the scale rather than sitting on an end it doesn't share. */
export function scalePositions(s: ScaleData): { lo: number; hi: number; typ: number; you: number | null; marks: number[] } {
  const extra = s.marks ?? [];
  const vals = [s.lo.v, s.hi.v, s.typ, ...(s.you ? [s.you.v] : []), ...extra.map((m) => m.v)];
  const min = Math.min(...vals), max = Math.max(...vals);
  const at = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 50);
  return { lo: at(s.lo.v), hi: at(s.hi.v), typ: at(s.typ), you: s.you ? at(s.you.v) : null, marks: extra.map((m) => at(m.v)) };
}

/* ---------- one stock group of a broker page, ready to render ---------- */

/** "S&P" and "500" never part at a line end (a no-break space). */
export const SP_GAP = "\u00a0";

/** "A", "A and B", "A, B and C" */
export const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export interface Group {
  sp: Sp;
  /** the figures' tag on the page (data-g): sp = S&P 500, ot = other stocks */
  g: "sp" | "ot";
  /** "S&P 500 stocks" / "Other stocks" */
  name: string;
  /** "S&P 500 orders" / "other-stock orders" */
  orders: string;
  /** every retail broker with a price, cheapest first */
  places: Place[];
  /** this broker's place; null for a clearing firm (not ranked among the brokers) or without a price */
  me: Place | null;
  m: Metric;
  /** "10th cheapest of 25"; for a clearing firm "Not ranked: a clearing firm"; null without a price */
  rank: string | null;
  /** the rank on the same stocks and order sizes (the answer card's second line, sameStockWords); null for a clearing
   *  firm, without a price or without a same-stock figure (the card then says nothing) */
  same: SameRank | null;
  /** "$0.91 more than the cheapest" + "Fidelity, $0.09 below" */
  diff: GapLine | null;
  /** graded by `rank` and `same` (priceSentence), so it never contradicts them */
  sentence: string | null;
  scale: ScaleData | null;
  pay: Pay;
  /** last month's places by reporter id (null when there is no earlier month) */
  last: Map<string, Place> | null;
}

/** The price card's second line: how far the broker is from the cheapest (or, for the cheapest, from the next one).
 *  `who` is the broker compared with and its price, shown in brackets and kept on one line. */
export interface GapLine { lead: string; who: string | null }
function gapLine(places: Place[], m: Metric, clearing: boolean): GapLine | null {
  if (m.cost10k == null || !places.length) return null;
  const c = cents(m.cost10k), low = cents(places[0].m.cost10k!);
  const lowest = places.filter((p) => cents(p.m.cost10k!) === low && p.m.id !== m.id);
  const named = (ps: Place[]) => (ps.length > 3 ? `${ps.slice(0, 3).map((p) => p.m.f.short).join(", ")} and others` : andList(ps.map((p) => p.m.f.short)));
  const by = (n: number) => usd2(Math.abs(n) / 100);
  const cheapest = `${named(lowest)}, ${fairText(places[0].m.cost10k!)}`;
  if (c < low) return { lead: `${by(low - c)} less than the cheapest broker`, who: cheapest };
  if (c === low) {
    if (lowest.length) return { lead: `Level with ${named(lowest)} at the lowest price`, who: null };
    const next = places.find((p) => cents(p.m.cost10k!) > c);
    return next ? { lead: `${by(cents(next.m.cost10k!) - c)} less than the next cheapest`, who: `${next.m.f.short}, ${fairText(next.m.cost10k!)}` } : null;
  }
  return { lead: `${by(c - low)} more than the cheapest${clearing ? " broker" : ""}`, who: cheapest };
}

export function groupOf(d: Data, firm: Firm, sp: Sp): Group {
  const clearing = firm.type === "clearing_firm";
  const places = placeBrokers(d, sp);
  const m = metric(d, firm, pageFilters(d, sp));
  const me = clearing ? null : places.find((p) => p.m.id === firm.id) ?? null;
  const months = d.meta.months, prev = months[months.indexOf(d.meta.month) - 1];
  const last = prev ? new Map(placeBrokers(d, sp, prev).map((p) => [p.m.id, p])) : null;
  const points = places.map((p) => ({ name: p.m.f.short, v: p.m.cost10k! }));
  const you = m.cost10k == null ? null : { name: firm.short, v: m.cost10k };
  // both grades from the ranks as shown: the price on the shown cents (rankWords' ends), the same stocks on the shown tenths
  const same = me ? sameStockRank(d, firm.id, sp) : null;
  const sentence = clearing
    ? `${firm.short} is a clearing firm: it settles trades for other brokers, and you can't open an account with it.`
    : me && places.length > 1 ? priceSentence(firm.short, gradeOf(me.rank, places.length, me.tied), same?.grade ?? null, m.gap == null) : null;
  return {
    sp, g: sp === "Y" ? "sp" : "ot", name: sp === "Y" ? `S&P${SP_GAP}500 stocks` : "Other stocks", orders: sp === "Y" ? `S&P${SP_GAP}500 orders` : "other-stock orders",
    places, me, m,
    rank: m.cost10k == null ? null : clearing ? "Not ranked: a clearing firm" : me ? rankWords(places, me) : null,
    same,
    diff: gapLine(places, m, clearing),
    sentence,
    scale: you ? scaleOf(points, you) : null,
    pay: payment(d, m, sp),
    last,
  };
}

/** "Jul–Sep 2026" or "Apr–Jun 2026, the latest it has filed" (a late filer's previous quarter, named as such). */
export const payWhen = (p: Pay) => (p.quarter ? `${quarterLong(p.quarter)}${p.fallback ? ", the latest it has filed" : ""}` : "");
