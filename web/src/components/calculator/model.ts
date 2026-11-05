// The calculator's numbers and words, generated from the inputs in use and the lines lib/cost.ts computes. Pure (no
// window, no React), so the pre-render and the browser say the same thing. One rule throughout: a figure on the page is
// the one the arithmetic used, and anything left out is named in words, never shown as $0.
import { andList, cents, SP_GAP, yearHeadline, yearly } from "../../lib/broker";
import { bestYield, yearSaid } from "../../lib/cash";
import { PARTS, type CostInputs, type CostLine, type PartKey } from "../../lib/cost";
import type { Data } from "../../lib/data";
import { num, ordinal, pct, usd2 } from "../../lib/format";

/** The broker that pays the most interest on cash, which sets the bar idle cash is measured against (lib/cash.ts, which
 *  the yearly cards' priced line uses too). */
export { bestYield };

/* ---------- the boxes the visitor types in ---------- */

export type FieldKey = "trades" | "size" | "options" | "idleCash" | "margin";
export interface Spec {
  min: number; max: number;
  /** a count (trades, contracts): whole numbers only */
  whole: boolean;
  /** dollars: shown with a "$" and thousands commas, cents allowed */
  usd: boolean;
  /** what an empty box means: nothing counted (an amount behind a Yes) or a mistake (the trades every estimate needs) */
  blank: "zero" | "error";
  example: string;
  /** a count's unit, singular and plural ("trade", "trades") */
  unit?: [string, string];
}

/** The limits: wide enough for any retail account, and they keep a slip of the finger (a trade size of $2,000,000,000)
 *  from turning into a figure nobody meant. */
export const SPECS: Record<FieldKey, Spec> = {
  trades: { min: 0, max: 100_000, whole: true, usd: false, blank: "error", example: "24", unit: ["trade", "trades"] },
  size: { min: 1, max: 1_000_000, whole: false, usd: true, blank: "error", example: "2,000" },
  options: { min: 0, max: 100_000, whole: true, usd: false, blank: "zero", example: "10", unit: ["contract", "contracts"] },
  idleCash: { min: 0, max: 10_000_000, whole: false, usd: true, blank: "zero", example: "5,000" },
  margin: { min: 0, max: 10_000_000, whole: false, usd: true, blank: "zero", example: "10,000" },
};

/** Dollars as typed back to the visitor: $2,000, $2,000.50. */
export const usd = (v: number) => `$${num(v, Number.isInteger(v) ? 0 : 2)}`;
/** A value as it reads in a sentence: "$2,000", "24 trades", "1 contract". */
export function said(v: number, s: Spec): string {
  if (s.usd) return usd(v);
  return s.unit ? `${num(v)} ${v === 1 ? s.unit[0] : s.unit[1]}` : num(v);
}
/** A value as it sits in its box: "2,000" (the "$" is drawn beside the box). */
export const boxText = (v: number, s: Spec) => num(v, s.usd && !Number.isInteger(v) ? 2 : 0);

export type Parsed = { ok: true; v: number } | { ok: false; why: string };

/** What the visitor typed, read the way they meant it ("$2,000" and "2000" are the same) or the reason it can't be used. */
export function parse(text: string, s: Spec): Parsed {
  const t = text.trim().replace(/^\$/, "").replace(/[,\s]/g, "");
  if (t === "") return s.blank === "zero" ? { ok: true, v: 0 } : { ok: false, why: "Enter a number" };
  if (/^[-−–]/.test(t)) return { ok: false, why: `Enter ${said(s.min, { ...s, unit: undefined })} or more` };
  const like = s.usd ? `an amount in dollars, like ${s.example}` : `a whole number, like ${s.example}`;
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return { ok: false, why: `Enter ${like}` };
  const v = Number(t);
  if (!Number.isFinite(v)) return { ok: false, why: `Enter ${like}` };
  if (s.whole && !Number.isInteger(v)) return { ok: false, why: `Enter ${like}` };
  if (v < s.min) return { ok: false, why: `Enter ${said(s.min, { ...s, unit: undefined })} or more` };
  if (v > s.max) return { ok: false, why: `Enter ${said(s.max, { ...s, unit: undefined })} or less` };
  return { ok: true, v: s.usd ? Math.round(v * 100) / 100 : v };
}

/** The second half of an error message: what the figures use until the box holds something usable. */
export const stillUsing = (v: number, s: Spec) =>
  v === 0 && s.blank === "zero" ? "Nothing is counted for now." : `Counting ${said(v, s)} for now.`;

/** The three stock mixes the page offers (percent of trades in S&P 500 stocks). */
export const MIXES = [100, 50, 0] as const;

/** Inputs from a link or from storage, held to what the boxes accept: counts whole, each value inside its limits, the mix
 *  on one of the three choices. So the boxes, the URL and the figures always show the same numbers. */
export function sanitize(i: CostInputs): CostInputs {
  const fit = (v: number, s: Spec) => {
    const x = Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.min;
    return s.whole ? Math.round(x) : Math.round(x * 100) / 100;
  };
  const mix = Number.isFinite(i.spMix) ? i.spMix : 50;
  return {
    trades: fit(i.trades, SPECS.trades), size: fit(i.size, SPECS.size), options: fit(i.options, SPECS.options),
    idleCash: fit(i.idleCash, SPECS.idleCash), margin: fit(i.margin, SPECS.margin),
    spMix: MIXES.reduce((a, b) => (Math.abs(b - mix) < Math.abs(a - mix) ? b : a), 50 as number),
  };
}

/* ---------- the sentence under the figure: what the estimate is for ---------- */

const mixWords = (m: number) =>
  m >= 100 ? `all S&P${SP_GAP}500 stocks` : m <= 0 ? "all other stocks" : `half S&P${SP_GAP}500 and half other stocks`;

/** "for 24 trades of $2,000, half S&P 500 and half other stocks", the broker pages' own words for the same habit, then
 *  anything else the visitor said yes to: ", plus 10 options contracts and $5,000 of idle cash". */
export function scopeLine(i: CostInputs): string {
  const trades = i.trades === 0 ? "for no stock trades" : `for ${said(i.trades, SPECS.trades)} of ${usd(i.size)}, ${mixWords(i.spMix)}`;
  const extras = [
    i.options > 0 && `${said(i.options, SPECS.options).replace("contract", "options contract")}`,
    i.idleCash > 0 && `${usd(i.idleCash)} of idle cash`,
    i.margin > 0 && `${usd(i.margin)} borrowed on margin`,
  ].filter((x): x is string => !!x);
  return extras.length ? `${trades}, plus ${andList(extras)}` : trades;
}

/* ---------- the parts of a year ---------- */

/** The parts of the total the visitor's answers bring in, in stack order: trade prices and commissions with any trades,
 *  options fees, idle cash and margin only after a Yes. */
export const partsInUse = (i: CostInputs) =>
  PARTS.filter((p) => (p.key === "spread" || p.key === "commissions" ? i.trades > 0
    : p.key === "optionsFees" ? i.options > 0 : p.key === "cashDrag" ? i.idleCash > 0 : i.margin > 0));

/** The fact a part is missing on a line (lib/cost.ts names them "commission", "cash yield (varies)" and so on), or null. */
export const missingFact = (l: CostLine, key: PartKey) => {
  const p = PARTS.find((x) => x.key === key)!;
  return l.missing.find((m) => p.facts.some((f) => m === f || m.startsWith(`${f} (`))) ?? null;
};

/** How an unknown part reads in place of a dollar figure: never $0 for something nobody confirmed. */
export function unknownWord(fact: string): string {
  if (fact.endsWith("(not offered)")) return "Not offered";
  if (fact.endsWith("(varies)")) return "Varies";
  if (fact.endsWith("prices")) return "Not reported";
  return "Not confirmed";
}

/** A broker that pays no interest on cash (fees.csv NA): lib/cost.ts names its missing rate "cash yield (not offered)",
 *  so every table, card and note says "Not offered" for it, never "Not confirmed". */
const paysNone = (fact: string) => fact === "cash yield (not offered)";

/** A rate as the broker publishes it: 5.25%, 11.575% (two decimals, three when it has three). */
const rate = (v: number) => pct(v, Math.min(3, Math.max(2, (String(v).split(".")[1] ?? "").length)));
/** A fee per trade or per contract: $0, $0.65, $4.95. */
const fee = (v: number) => (Number.isInteger(v) ? `$${v}` : usd2(v));

export interface Row { key: PartKey; label: string; note: string | null; value: string; unknown: boolean }

/** One row per part in use for a broker's line: the dollars, or the word for an unknown part, with the rate behind it. */
export function partRows(d: Data, l: CostLine, i: CostInputs): Row[] {
  const f = d.fees[l.id];
  const best = bestYield(d);
  return partsInUse(i).map((p): Row => {
    const fact = missingFact(l, p.key);
    const priceGap = p.key === "spread" && fact != null;
    // a price group with no report leaves the other one counted: the row shows what was counted and says what wasn't
    const unknown = fact != null && !priceGap;
    let note: string | null = null;
    if (p.key === "spread") {
      note = priceGap ? `${fact === "S&P 500 prices" ? `S&P${SP_GAP}500` : "Other-stock"} prices not reported`
        : `${cents(l.spread) < 0 ? "below" : "above"} the fair price, on ${usd(i.size)} orders`;
    } else if (unknown) note = null;
    else if (p.key === "commissions") note = `${said(i.trades, SPECS.trades)} at ${fee(f!.commission!)}`;
    else if (p.key === "optionsFees") note = `${said(i.options, SPECS.options)} at ${fee(f!.optionsFee!)}`;
    else if (p.key === "cashDrag" && best && f?.cashYield != null)
      note = f.cashYield >= best.rate ? `earns ${rate(f.cashYield)}, the most of any broker` : `earns ${rate(f.cashYield)}; ${best.short} pays ${rate(best.rate)}`;
    else if (p.key === "marginInterest") note = `${usd(i.margin)} at ${rate(f!.marginRate!)} a year`;
    return { key: p.key, label: p.label, note, value: unknown ? unknownWord(fact!) : yearSaid(l[p.key]), unknown };
  });
}

/* ---------- the figure, the rank, the gap to the cheapest ---------- */

/** The broker pages' yearly headline ("About $9 a year", "At least $9.80 a year", "About $3 ahead a year"), split so the
 *  amount can be set at the Display size: the words are lib/broker.ts's own, so the two pages never disagree. */
export function headline(l: CostLine): { text: string; pre: string; fig: string; post: string } {
  const text = yearHeadline(l);
  const m = /^(About|At least) (\S+) (ahead a year|a year)$/.exec(text);
  return m ? { text, pre: m[1], fig: m[2], post: m[3] } : { text, pre: "", fig: text, post: "" };
}

/** "at least $9.80" for a line missing a part (what was counted, never rounded up), its own figure otherwise, a figure
 *  below zero in words ("$0.22 ahead"). */
export const totalWords = (l: CostLine) => (l.gaps.length ? `at least ${l.total <= 0 ? "$0" : yearly(l.total)}` : yearSaid(l.total));

export interface Ranked {
  /** the brokers whose every part the visitor uses is confirmed, cheapest first: the only ones ranked */
  complete: CostLine[];
  /** each complete broker's rank on the shown cents (the same price, the same rank), by id */
  ranks: Map<string, number>;
}
export function rankAll(lines: CostLine[]): Ranked {
  const complete = lines.filter((l) => l.gaps.length === 0); // annualCost lists complete lines first, cheapest first
  const c = complete.map((l) => cents(l.total));
  return { complete, ranks: new Map(complete.map((l, i) => [l.id, c.indexOf(c[i]) + 1])) };
}

/** What makes a broker's figure complete for these habits: its fee for each thing the visitor does is confirmed. With
 *  the broker pages' habit (trades only) the words are theirs: "whose commission is confirmed". Empty when no fee counts. */
export function poolClause(i: CostInputs): string {
  const facts = [i.trades > 0 && "commission", i.options > 0 && "options fee", i.idleCash > 0 && "interest on cash", i.margin > 0 && "margin rate"]
    .filter((x): x is string => !!x);
  return facts.length ? `whose ${andList(facts)} ${facts.length > 1 ? "are" : "is"} confirmed` : "";
}
/** "the 20 brokers whose commission is confirmed", "the one broker whose …". */
export const pool = (n: number, clause: string) => `${n === 1 ? "the one broker" : `the ${n} brokers`}${clause ? ` ${clause}` : ""}`;

/** "11th cheapest of the 20 brokers whose commission is confirmed" (the cheapest, the most expensive, ties as on the
 *  broker pages), or null when this broker isn't ranked. */
export function rankWords(r: Ranked, l: CostLine, clause: string): string | null {
  const rank = r.ranks.get(l.id);
  if (rank == null) return null;
  const n = r.complete.length, c = cents(l.total);
  if (n === 1) return `The only broker${clause ? ` ${clause}` : " with a figure"}`;
  const tied = r.complete.filter((x) => cents(x.total) === c).length > 1;
  const of = `of ${pool(n, clause)}`;
  if (c === cents(r.complete[0].total)) return `${tied ? "Tied cheapest" : "The cheapest"} ${of}`;
  if (c === cents(r.complete[n - 1].total)) return `${tied ? "Tied most expensive" : "The most expensive"} ${of}`;
  return `${tied ? "Tied " : ""}${ordinal(rank)} cheapest ${of}`;
}

/** "$9.17 more a year than the cheapest" + "Fidelity, $0.22 ahead"; for the cheapest, the gap to the next one. */
export function gapLine(r: Ranked, l: CostLine): { lead: string; who: string | null } | null {
  if (!r.ranks.has(l.id) || r.complete.length < 2) return null;
  const c = cents(l.total), low = cents(r.complete[0].total);
  const lowest = r.complete.filter((x) => cents(x.total) === low && x.id !== l.id);
  const named = (xs: CostLine[]) => (xs.length > 3 ? `${xs.slice(0, 3).map((x) => x.short).join(", ")} and others` : andList(xs.map((x) => x.short)));
  const by = (n: number) => yearly(Math.abs(n) / 100);
  if (c === low) {
    if (lowest.length) return { lead: `Level with ${named(lowest)} at the lowest`, who: null };
    const next = r.complete.find((x) => cents(x.total) > c);
    return next ? { lead: `${by(cents(next.total) - c)} less a year than the next cheapest`, who: `${next.short}, ${yearSaid(next.total)}` } : null;
  }
  return { lead: `${by(c - low)} more a year than the cheapest`, who: `${named(r.complete.filter((x) => cents(x.total) === low))}, ${yearSaid(r.complete[0].total)}` };
}

/** Why a broker's figure is a minimum, one plain sentence per gap ("Avenue's commission isn't confirmed, so it isn't
 *  counted."); an advisor-only broker gets one sentence for all its fees. */
export function whyWords(d: Data, l: CostLine): string[] {
  const f = d.fees[l.id], s = l.short;
  const out: string[] = [];
  const fees = l.missing.filter((m) => !m.endsWith("prices"));
  if (fees.length && f && !f.retail) out.push(`${s} offers advisor-managed accounts only, with no public price list, so its fees aren't counted.`);
  else for (const m of fees) {
    const what = m.startsWith("commission") ? "commission" : m.startsWith("options") ? "options fee" : m.startsWith("cash") ? "interest on cash" : "margin rate";
    out.push(m === "options (not offered)" ? `${s} doesn't offer options trading, so options aren't counted.`
      : paysNone(m) ? `${s} pays no interest on cash; its idle cash isn't counted.`
        : m.endsWith("(varies)") ? `${s}'s ${what} varies by balance or program, so it isn't counted.`
          : `${s}'s ${what} isn't confirmed, so it isn't counted.`);
  }
  for (const m of l.missing.filter((x) => x.endsWith("prices"))) {
    out.push(`${s} has no ${m === "S&P 500 prices" ? `S&P${SP_GAP}500` : "other-stock"} price report for orders this size, so those trades aren't counted.`);
  }
  return out;
}

/** The typical (median) year on the scale, rounded: it is no broker's own figure. */
export const about = (v: number) => `about ${Math.abs(v) < 1 ? usd2(v) : `${v < 0 ? "−" : ""}$${num(Math.round(Math.abs(v)))}`}`;
