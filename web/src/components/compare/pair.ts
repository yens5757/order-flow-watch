// The numbers and words of a comparison page, generated from the data. Pure (no window, no React), so the pre-render and
// the browser state the same answer. One price measure, as on the broker pages: dollars paid above the fair price per
// $10,000 traded (Metric.cost10k), compared on the cents each page shows.
import { cents, money, payAmount, payWhen, SP_GAP, type Pay, type Place } from "../../lib/broker";
import { brokerRows, type Data, type Fee, type FeeKey, type Filters, type Firm, type Metric, type Ot, type Sp } from "../../lib/data";
import { num, pct, quarterLong } from "../../lib/format";

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

/** First paragraph: who paid less and by how much, then whether that holds on the same stocks and order sizes. */
export function priceText(d: Data, f: Filters, A: Firm, B: Firm, rA: Metric, rB: Metric, monthName: string): string[] {
  const out: string[] = [];
  const g = gapOf(A, B, rA, rB);
  const where = `per $10,000 of ${ordersWord(f.ot)} in ${stocksWord(f.sp)}`;
  if (g.c == null) {
    const gone = [rA.cost10k == null ? A : null, rB.cost10k == null ? B : null].filter((x): x is Firm => !!x);
    out.push(`${gone.map((F) => noPrice(d, F, f.month, monthName)).join("; ")}.`);
  } else if (!g.cheap) {
    const [a, b] = [rA.cost10k!, rB.cost10k!];
    const both = sideOf(a) === sideOf(b) ? `${money(Math.abs(a))} and ${money(Math.abs(b))} ${sideOf(a)}` : `${money(Math.abs(a))} ${sideOf(a)} and ${money(Math.abs(b))} ${sideOf(b)}`;
    out.push(`${capital(where)}, ${A.short} and ${B.short} customers paid about the same: ${both}.`);
  } else {
    out.push(`${capital(where)}, ${g.cheap.short} customers paid about ${gapMoney(g.c)} less than ${g.dear!.short} customers.`);
  }
  // the same stocks and order sizes: market orders, all sizes (Metric.gap), whatever order type is shown
  if (rA.gap != null && rB.gap != null) {
    const s = rA.gap - rB.gap; // > 0: B gets the better price on the same stocks and sizes
    const ml = f.ot === "ML";
    const on = ml ? "For market orders on the same stocks and order sizes" : "On the same stocks and order sizes";
    if (Math.abs(s) < SAME_LEVEL) out.push(`${on}, the two are level.`);
    else {
      const ahead = s > 0 ? B : A;
      out.push(!g.cheap
        ? `${on}, ${ahead.short} comes out ahead.`
        : ahead.id === g.cheap.id
          ? ml ? "For market orders, that holds on the same stocks and order sizes too." : "That holds on the same stocks and order sizes too."
          : `${on}, though, ${ahead.short} comes out ahead: part of the gap is what each broker's customers trade.`);
    }
  }
  return out;
}

/** "Fidelity was paid about $0.04 per $10,000", in the broker pages' words: a payment to a trading firm only when the 606
 *  shows one; money that goes to exchanges is exchange fees. */
function paidPhrase(F: Firm, p: Pay): string {
  switch (p.kind) {
    case "none": return `${F.short} files no payment report of its own (another firm routes its orders)`;
    case "missing": return `${F.short}'s payment report has no figure for these orders this quarter`;
    case "paid": return `${F.short} was paid about ${payAmount(p)}`;
    case "pays": return `${F.short} paid its trading firm about ${payAmount(p)}`;
    case "fees": return `no trading firm paid ${F.short}, which paid about ${payAmount(p)} in exchange fees`;
    default: return `${F.short} wasn't paid for its customers' orders`;
  }
}

/** Second paragraph: what each was paid for the orders (a late filer's quarter named), then whether fees change the picture. */
export function moneyText(A: Firm, B: Firm, pA: Pay, pB: Pay, feeA: Fee | undefined, feeB: Fee | undefined, g: Gap): string[] {
  const out: string[] = [];
  // a late filer's quarter, named once: "(Public: Apr–Jun 2026, the latest it has filed)", "(both from Apr–Jun 2026, …)"
  const late = ([[A, pA], [B, pB]] as [Firm, Pay][]).filter(([, p]) => p.fallback && p.quarter);
  const when = !late.length ? ""
    : late.length === 2 && late[0][1].quarter === late[1][1].quarter ? ` (both from ${quarterLong(late[0][1].quarter!)}, the latest they have filed)`
      : ` (${late.map(([F, p]) => `${F.short}: ${payWhen(p)}`).join("; ")})`;
  if (pA.kind === "paid" && pB.kind === "paid" && pA.v != null && pB.v != null) {
    out.push(`Trading firms paid ${A.short} about ${money(pA.v)} and ${B.short} about ${money(pB.v)} per $10,000 of orders${when}.`);
  } else {
    out.push(`${capital(paidPhrase(A, pA))}; ${paidPhrase(B, pB)}${when}.`);
  }
  const ca = feeA?.commission ?? null, cb = feeB?.commission ?? null;
  if (ca != null && cb != null) {
    if (ca === cb) out.push(ca === 0 ? "Neither charges a stock commission." : `Both charge ${feeDollars(ca)} per stock trade.`);
    else {
      const [hi, lo] = ca > cb ? [A, B] : [B, A];
      const gap = Math.abs(ca - cb);
      const vs = g.c == null ? "" : `, ${gap * 100 > Math.abs(g.c) ? "more" : "less"} than the price gap on a $10,000 trade`;
      out.push(`${hi.short} charges ${feeDollars(Math.max(ca, cb))} per stock trade and ${lo.short} ${feeDollars(Math.min(ca, cb))}${vs}.`);
    }
  } else {
    for (const [F, fee] of [[A, feeA], [B, feeB]] as [Firm, Fee | undefined][]) {
      if (fee?.commission != null) continue;
      out.push(fee?.varies.includes("commission") ? `${F.short}'s stock commission varies.`
        : fee && !fee.retail ? `${F.short} publishes no price list (advisor-managed accounts only).`
          : `${F.short}'s stock commission isn't confirmed yet.`);
    }
  }
  const oa = feeA?.optionsFee ?? null, ob = feeB?.optionsFee ?? null;
  if (oa != null && ob != null && oa !== ob) out.push(`Options cost ${feeDollars(oa)} per contract at ${A.short} and ${feeDollars(ob)} at ${B.short}.`);
  return out;
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
