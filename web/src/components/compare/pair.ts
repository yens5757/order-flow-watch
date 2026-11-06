// The numbers and words of a comparison page, generated from the data. Pure (no window, no React), so the pre-render and
// the browser state the same answer. One price measure, as on the broker pages: dollars paid above the fair price per
// $10,000 traded (Metric.cost10k), compared on the cents each page shows.
import { cents, money, SP_GAP, type Place } from "../../lib/broker";
import { brokerRows, type Data, type Fee, type FeeKey, type Filters, type Firm, type Metric, type Ot, type Sp } from "../../lib/data";
import { num, pct } from "../../lib/format";

/** The page's filters: the visitor's stock group, order type, month and payment quarter; all sizes under $200,000
 *  averaged; retail brokers only (a clearing firm is never ranked, whatever another page last showed). */
export const pairFilters = (f: Filters): Filters => ({ ...f, b: 199999, clearing: false });

/** Every retail broker with a price under these filters, cheapest first, ranked on the shown cents (brokers showing the
 *  same price share a rank), as lib/broker.ts placeBrokers ranks them for the broker pages. */
export function placesFor(d: Data, s: Filters): Place[] {
  const rows = brokerRows(d, s).filter((r) => r.f.type === "broker" && r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!);
  const c = rows.map((r) => cents(r.cost10k!));
  return rows.map((m, i) => ({ m, rank: c.indexOf(c[i]) + 1, tied: c.filter((x) => x === c[i]).length > 1 }));
}

/** "S&P 500 stocks" / "other stocks" ("S&P" and "500" never part at a line end). */
export const stocksWord = (sp: Sp) => (sp === "Y" ? `S&P${SP_GAP}500 stocks` : "other stocks");
export const ordersWord = (ot: Ot) => (ot === "M" ? "market orders" : "marketable limit orders");
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Where a price sits against the fair price, on the cents shown. */
export const sideOf = (v: number) => (cents(v) > 0 ? "above the fair price" : cents(v) < 0 ? "below the fair price" : "at the fair price");

/** Whether a firm published any price report for a month (so a missing figure means "not for these orders", not "no report"). */
export const reported = (d: Data, id: string, month: string) => {
  for (const k of d.exec.keys()) if (k.startsWith(`${id}|${month}|`)) return true;
  return false;
};

/** What a missing price says: "Fidelity hasn't published a September 2026 price report yet" or, when it has one without
 *  these orders, "Fidelity's September 2026 report has no figure for these orders". */
export const noPrice = (d: Data, F: Firm, month: string, monthName: string) =>
  reported(d, F.id, month) ? `${F.short}'s ${monthName} report has no figure for these orders` : `${F.short} hasn't published a ${monthName} price report yet`;

/** The answer card's lead when a price is missing, as whole sentences: one for both brokers when the reason is the same
 *  ("Cash App's and eToro's September 2026 reports have no figure for these orders."), each name as the broker writes it
 *  ("eToro", never "EToro"). */
export function noPrices(d: Data, firms: Firm[], month: string, monthName: string): string {
  if (firms.length === 2) {
    const [a, b] = firms.map((F) => reported(d, F.id, month));
    if (a && b) return `${firms[0].short}'s and ${firms[1].short}'s ${monthName} reports have no figure for these orders.`;
    if (!a && !b) return `${firms[0].short} and ${firms[1].short} haven't published a ${monthName} price report yet.`;
  }
  return firms.map((F) => `${noPrice(d, F, month, monthName)}.`).join(" ");
}

/* ---------- the gap between the two ---------- */

/** Below this many cents per $10,000 the two are "about the same". */
export const LEVEL = 5;
export interface Gap {
  /** whole cents, A minus B: above zero when B is cheaper; null when either has no price */
  c: number | null;
  /** the broker whose customers paid less, null when level or unknown */
  cheap: Firm | null;
  dear: Firm | null;
}
export function gapOf(A: Firm, B: Firm, rA: Metric, rB: Metric): Gap {
  if (rA.cost10k == null || rB.cost10k == null) return { c: null, cheap: null, dear: null };
  const c = cents(rA.cost10k) - cents(rB.cost10k);
  if (Math.abs(c) < LEVEL) return { c, cheap: null, dear: null };
  return { c, cheap: c > 0 ? B : A, dear: c > 0 ? A : B };
}
/** The gap as money, from the shown cents: $0.91. */
export const gapMoney = (c: number) => money(Math.abs(c) / 100);

/** Below this many points of the spread apart, the two brokers' same-stock gaps are "level": the short answer says so and
 *  the side-by-side table's rank row marks neither as better. */
export const SAME_LEVEL = 1;

/* ---------- the short answer ---------- */

/** The answer card's one sentence, on the two measures it compares, in the words the card's own figure uses: who paid
 *  less on average (the figure above it; "about the same" within LEVEL cents) and on the same stocks and order sizes
 *  (market orders of every size, Metric.gap, whatever order type is shown; "level" within SAME_LEVEL points, where the
 *  side-by-side table ticks neither rank). Said once when the two agree, joined by "but" when they part. What each is
 *  paid and the fees have cards of their own, so they aren't repeated here. Null when there is nothing to say beyond the
 *  card's own line about a missing price. */
export function pairSentence(f: Filters, A: Firm, B: Firm, rA: Metric, rB: Metric): string | null {
  const g = gapOf(A, B, rA, rB);
  const on = f.ot === "ML" ? "for market orders on the same stocks and order sizes" : "on the same stocks and order sizes";
  // the same stocks and order sizes: the broker whose customers paid less there, "level", or null without both figures
  const s = rA.gap != null && rB.gap != null ? rA.gap - rB.gap : null; // > 0: B's customers paid less there
  const same: Firm | "level" | null = s == null ? null : Math.abs(s) < SAME_LEVEL ? "level" : s > 0 ? B : A;
  // a broker too few of whose trades match other brokers' has no same-stock figure (the broker page's words)
  const unmatched = [rA.gap == null ? A : null, rB.gap == null ? B : null].filter((x): x is Firm => !!x);
  const why = unmatched.length === 2 ? "their" : unmatched.length ? `${unmatched[0].short}'s` : "";
  const tooFew = `too few of ${why} trades match other brokers' to compare them ${on}`;

  if (g.c == null) {
    // no figure to compare (the card's lead says whose price is missing): only the same stocks and order sizes, if known
    return same == null ? null : same === "level" ? `${capital(on)}, the two are level.` : `${capital(on)}, ${same.short}'s customers paid less.`;
  }
  if (g.cheap) {
    const X = g.cheap, Y = g.dear!;
    if (same == null) return `${X.short}'s customers paid less on average; ${tooFew}.`;
    if (same === "level") return `${X.short}'s customers paid less on average, but the two are level ${on}.`;
    return same.id === X.id
      ? `${X.short}'s customers paid less, on average and ${on}.`
      : `${X.short}'s customers paid less on average, but ${Y.short}'s paid less ${on}.`;
  }
  if (same == null) return `Both brokers' customers paid about the same on average; ${tooFew}.`;
  if (same === "level") return `Both brokers' customers paid about the same, on average and ${on}.`;
  return `Both brokers' customers paid about the same on average, but ${same.short}'s paid less ${on}.`;
}

/* ---------- fees and other figures, as the broker pages show them ---------- */

/** Fee dollars: whole amounts without cents ($0, $75), otherwise two decimals ($0.65). */
export const feeDollars = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
/** A rate as published: two decimals, three when the broker publishes three (11.575%). */
export const feeRate = (v: number) => pct(v, Math.min(3, Math.max(2, (String(v).split(".")[1] ?? "").length)));
/** Why a fee is blank: the product isn't offered, the rate depends on a tier, or nobody could confirm it. */
export const feeBlank = (fee: Fee | undefined, k: FeeKey) =>
  fee?.notOffered.includes(k) ? "Not offered" : fee?.varies.includes(k) ? "Varies" : "Not confirmed";
/** An average order in round money (the report's $10,001 is false precision): nearest $100 from $1,000, else nearest $10. */
export const roundOrder = (v: number) => `$${num(v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10)}`;
/** The same-stock gap (Metric.gap, points of the spread against other brokers) in words rather than a sign, as the
 *  trading-firms page says it: "15.2 points less", "24.4 points more", "about the same" (rounds to 0.0). */
export const gapWords = (v: number) => (Math.abs(v) < 0.05 ? "about the same" : `${Math.abs(v).toFixed(1)} points ${v < 0 ? "less" : "more"}`);
