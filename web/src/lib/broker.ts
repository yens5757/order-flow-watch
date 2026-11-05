// The numbers and sentences of a broker page, generated from the data. Pure (no window, no React), so the pre-render
// and the browser compute the same page, and other pages (Home, the search descriptions in routes.ts) can agree with it.
// One ranking measure everywhere: dollars paid above the fair price per $10,000 traded (Metric.cost10k).
import { annualCost, type CostInputs, type CostLine } from "./cost";
import { brokerRows, files606, metric, type Data, type Filters, type Firm, type Metric, type Sp } from "./data";
import { ordinal, quarterLong, usd2 } from "./format";
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

/* ---------- the same stocks and order sizes ---------- */

/** Points of the spread past which a broker is better or worse than most brokers on the same stocks and order sizes
 *  (Metric.gap). Home's broker card and the broker pages use this one rule, so they never disagree. */
export const SAME_STOCK_MARGIN = 3;
export type Verdict = "better" | "worse" | "average";
export const sameStockVerdict = (gap: number | null | undefined): Verdict | null =>
  gap == null ? null : gap < -SAME_STOCK_MARGIN ? "better" : gap > SAME_STOCK_MARGIN ? "worse" : "average";

/** The price card's one sentence: where the broker sits on what its customers paid, then whether that holds on the same
 *  stocks and order sizes. "but" when the two point different ways (a broker can look cheap because of what its
 *  customers trade). */
export function priceSentence(short: string, pos: Third, v: Verdict | null): string {
  const lead = pos === "cheapest" ? `${short} is in the cheapest third on what its customers paid`
    : pos === "dearest" ? `${short} is in the most expensive third on what its customers paid`
      : `${short} sits near the middle on what its customers paid`;
  if (v == null) return `${lead}; too few of its trades match other brokers' to compare them on the same stocks and order sizes.`;
  const tone = (x: Third | Verdict) => (x === "cheapest" || x === "better" ? 1 : x === "dearest" || x === "worse" ? -1 : 0);
  const conj = tone(pos) === tone(v) ? "and" : "but";
  return v === "average"
    ? `${lead}, ${conj} on the same stocks and order sizes its prices were about average.`
    : `${lead}, ${conj} on the same stocks and order sizes its prices were ${v} than most brokers'.`;
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
  /** dollars per $10,000 order; null when this month's price report is missing (so no share price to convert with) */
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
  /** "$0.91 more than the cheapest" + "Fidelity, −$0.09" */
  diff: GapLine | null;
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
  const cheapest = `${named(lowest)}, ${money(places[0].m.cost10k!)}`;
  if (c < low) return { lead: `${by(low - c)} less than the cheapest broker`, who: cheapest };
  if (c === low) {
    if (lowest.length) return { lead: `Level with ${named(lowest)} at the lowest price`, who: null };
    const next = places.find((p) => cents(p.m.cost10k!) > c);
    return next ? { lead: `${by(cents(next.m.cost10k!) - c)} less than the next cheapest`, who: `${next.m.f.short}, ${money(next.m.cost10k!)}` } : null;
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
  const pos = me ? third(me.rank, places.length) : null;
  const sentence = clearing
    ? `${firm.short} is a clearing firm: it settles trades for other brokers, and you can't open an account with it.`
    : pos ? priceSentence(firm.short, pos, sameStockVerdict(m.gap)) : null;
  return {
    sp, g: sp === "Y" ? "sp" : "ot", name: sp === "Y" ? `S&P${SP_GAP}500 stocks` : "Other stocks", orders: sp === "Y" ? `S&P${SP_GAP}500 orders` : "other-stock orders",
    places, me, m,
    rank: m.cost10k == null ? null : clearing ? "Not ranked: a clearing firm" : me ? rankWords(places, me) : null,
    diff: gapLine(places, m, clearing),
    sentence,
    scale: you ? scaleOf(points, you) : null,
    pay: payment(d, m, sp),
    last,
  };
}

/** "Jul–Sep 2026" or "Apr–Jun 2026, the latest it has filed" (a late filer's previous quarter, named as such). */
export const payWhen = (p: Pay) => (p.quarter ? `${quarterLong(p.quarter)}${p.fallback ? ", the latest it has filed" : ""}` : "");
