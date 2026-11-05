// The money a year at a broker can move beyond its yearly figure, in one priced line: interest on cash kept there and the
// fee for moving the whole account out (fees.csv). Cash is priced per $1,000 kept there for a year by the calculator's own
// arithmetic (lib/cost.ts annualCost on the broker pages' habit: the interest that cash misses against the best-paying
// broker), so the broker page, Compare and the calculator never disagree. Neither is added to the yearly figure (trade
// prices and commissions), and idle cash stays a question the calculator asks. A fee nobody confirmed, one that varies and
// a product the broker doesn't offer are said in words, never as $0. Also here: yearly dollars with a figure below zero
// said in words ("$0.22 ahead"), as the yearly cards and the calculator show them. Pure (no window, no React).
import { cents, HABIT, yearly } from "./broker";
import { annualCost } from "./cost";
import type { Data, Fee, FeeKey, Firm } from "./data";
import { pct } from "./format";

/** A no-break space: "$0.22 ahead" and "Moving out: $100" stay on one line. */
const NB = String.fromCharCode(0xa0);

/* ---------- yearly dollars, said ---------- */

/** Yearly dollars as the yearly cards and the calculator say them: $8.95, $1,250, and a figure below zero in words, "$0.22
 *  ahead" (prices that beat the fair price leave the customer ahead, the word lib/broker.ts yearHeadline uses for a whole
 *  year), never "−$0.22". */
export const yearSaid = (v: number) => (cents(v) < 0 ? `${yearly(-v)}${NB}ahead` : yearly(v));

/* ---------- interest on cash ---------- */

export interface Best { id: string; short: string; rate: number }

/** The broker that pays the most interest on cash: the bar the calculator measures idle cash against. */
export function bestYield(d: Data): Best | null {
  let best: Best | null = null;
  for (const b of d.brokers) {
    const r = d.fees[b.id]?.cashYield;
    if (r != null && (!best || r > best.rate)) best = { id: b.id, short: b.short, rate: r };
  }
  return best;
}

/** The amount the line prices: $1,000 kept at the broker for a year. */
const PER = 1000;
const memo = new WeakMap<Data, Map<string, number>>();

/** What $1,000 kept at each broker for a year misses against the best-paying broker, by id: the calculator's own idle-cash
 *  figure for the broker pages' habit plus $1,000 of cash (lib/cost.ts annualCost), so the two can't disagree. A broker
 *  whose rate isn't confirmed, varies or isn't offered has none. */
export function cashMissed(d: Data): Map<string, number> {
  let m = memo.get(d);
  if (!m) {
    m = new Map(annualCost(d, { ...HABIT, idleCash: PER })
      .filter((l) => !l.missing.some((f) => f.startsWith("cash yield")))
      .map((l) => [l.id, l.cashDrag]));
    memo.set(d, m);
  }
  return m;
}

/* ---------- the priced line ---------- */

/** One fee fact: its figure, or the word for why there is none ("not offered" for cash means no interest is paid). */
type Fact = { v: number } | { w: "not offered" | "varies" | "not confirmed" };
const factOf = (fee: Fee | undefined, k: FeeKey): Fact => {
  const v = fee?.[k];
  if (v != null) return { v };
  return { w: fee?.notOffered.includes(k) ? "not offered" : fee?.varies.includes(k) ? "varies" : "not confirmed" };
};
/** Why a fact has no figure, said after its name as the fee tables say it ("Not offered", "Varies", "Not confirmed"):
 *  "Cash interest isn't offered.", "SoFi's cash interest varies; tastytrade's isn't confirmed." */
const isWord = (w: string) => (w === "varies" ? "varies" : w === "not offered" ? "isn't offered" : "isn't confirmed");

/** A rate as the broker publishes it: 0.00%, 3.52%, 11.575%. */
const rate = (v: number) => pct(v, Math.min(3, Math.max(2, (String(v).split(".")[1] ?? "").length)));
/** A fee or a gap between two fees: $0, $75, $49.95, $50.05. */
const fee$ = (v: number) => { const c = Math.round(v * 100) / 100; return `$${Number.isInteger(c) ? c : c.toFixed(2)}`; };

/** A run of the line: plain words, a figure (set in bold), or where the (i) goes. */
export type Run = string | { fig: string } | { info: true };
export interface PricedLine {
  runs: Run[];
  /** what the (i) says: the rates and fees behind a difference, or null when the line already holds every figure */
  info: string | null;
  /** the (i)'s name, "About <topic>" */
  topic: string;
}
/** The line as plain text (the (i) left out). */
export const lineText = (l: PricedLine) => l.runs.map((r) => (typeof r === "string" ? r : "fig" in r ? r.fig : "")).join("").trim();

/** "Moving out:" held to the figure after it (no-break spaces), so a line never parts "Moving" from "out" or the label
 *  from its amount. */
const MOVING = `Moving${NB}out:${NB}`;

/** The moving-out sentence of one broker: "Moving out: $100." */
function moveSentence(m: Fact): Run[] {
  if ("v" in m) return [MOVING, { fig: fee$(m.v) }, "."];
  return [m.w === "varies" ? "The moving-out fee varies." : m.w === "not offered" ? "Moving out isn't offered." : "The moving-out fee isn't confirmed."];
}

/** An advisor-only broker with no public price list: the yearly card's own note already says its fees can't be read, so
 *  the line has nothing to add about it. */
const priceListless = (f: Fee | undefined) =>
  !!f && !f.retail && f.commission == null && f.cashYield == null && f.transferOut == null;

/** The broker page's line: "$1,000 of cash earns $38.80 a year less than at Vanguard. Moving out: $100." The best
 *  payer: "Cash earns 3.88%, the most of any broker." A rate it doesn't offer, one that varies or one nobody confirmed:
 *  in the fee tables' words ("Cash interest isn't offered."). Null for an advisor-only broker without a public price list
 *  (the card's note covers it). */
export function cashLine(d: Data, F: Firm): PricedLine | null {
  const f = d.fees[F.id];
  if (priceListless(f)) return null;
  const cash = factOf(f, "cashYield"), move = factOf(f, "transferOut");
  // nothing known about either, for the same reason: one sentence
  if ("w" in cash && "w" in move && cash.w === move.w && cash.w !== "not offered") {
    return { runs: [cash.w === "varies" ? "Cash interest and the moving-out fee vary." : "Cash interest and the moving-out fee aren't confirmed."], info: null, topic: "" };
  }
  const best = bestYield(d), missed = cashMissed(d).get(F.id);
  const runs: Run[] = [];
  let info: string | null = null;
  if ("v" in cash && best && missed != null && cents(missed) > 0) {
    runs.push("$1,000 of cash earns ", { fig: `${yearly(missed)} a year less` }, ` than at ${best.short}.`, { info: true }, " ");
    info = `${F.short} pays ${rate(cash.v)} a year on uninvested cash; ${best.short} pays ${rate(best.rate)}, the most of any broker.`;
  } else if ("v" in cash && cash.v > 0) {
    runs.push("Cash earns ", { fig: rate(cash.v) }, missed != null ? ", the most of any broker. " : ". ");
  } else if ("v" in cash) {
    runs.push("Cash earns no interest. ");
  } else {
    runs.push(`Cash interest ${isWord(cash.w)}. `);
  }
  return { runs: [...runs, ...moveSentence(move)], info, topic: "cash interest" };
}

/** Compare's line, in the yearly card's terms (what is better where, and by how much): "At Fidelity, $1,000 of cash earns
 *  $35.20 a year more and moving out costs $100 less." Each broker's own rate and fee are in the side-by-side table on the
 *  same page, so the line needs no (i), and a fact that can't be compared names only the broker it is missing at
 *  ("tastytrade's cash interest isn't confirmed."; "Albert's cash interest and moving-out fee aren't confirmed."; "Cash
 *  interest: 0.50% at Webull, not offered at Cash App."). Null when nothing can be compared and the card's note on an
 *  advisor-only broker already says why. */
export function cashPair(d: Data, A: Firm, B: Firm): PricedLine | null {
  const F = [A, B] as const;
  const cash = [factOf(d.fees[A.id], "cashYield"), factOf(d.fees[B.id], "cashYield")] as const;
  const move = [factOf(d.fees[A.id], "transferOut"), factOf(d.fees[B.id], "transferOut")] as const;
  const line = (...runs: Run[]): PricedLine => ({ runs, info: null, topic: "" });

  // a broker with neither fact confirmed: one sentence about it, unless the card's note on an advisor-only broker says it
  const blank = [0, 1].filter((i) => [cash[i], move[i]].every((x) => "w" in x && x.w === "not confirmed"));
  const noted = blank.filter((i) => priceListless(d.fees[F[i].id]));
  const unsaid = blank.filter((i) => !noted.includes(i));
  if (unsaid.length === 2) return line("Cash interest and the moving-out fee aren't confirmed at either.");
  if (unsaid.length === 1) return line(`${F[unsaid[0]].short}'s cash interest and moving-out fee aren't confirmed.`);
  if (noted.length) return null;

  // cash: the difference between the calculator's figures for the two (the difference between their rates); "no interest"
  // covers a 0.00% rate and a broker that pays none alike
  const missed = cashMissed(d), x = [missed.get(A.id), missed.get(B.id)];
  const none = (f: Fact) => ("v" in f ? f.v === 0 : f.w === "not offered");
  let cashWin = -1, cashBy = 0, cashRuns: Run[];
  const [c0, c1] = cash;
  if (none(c0) && none(c1)) cashRuns = ["Neither pays interest on cash."];
  else if ("v" in c0 && "v" in c1 && x[0] != null && x[1] != null) {
    const gap = x[1] - x[0]; // above zero: cash earns more at A
    if (cents(gap) === 0) cashRuns = ["Cash earns ", { fig: rate(c0.v) }, " at both."];
    else {
      cashWin = gap > 0 ? 0 : 1; cashBy = Math.abs(gap);
      cashRuns = ["$1,000 of cash earns ", { fig: `${yearly(cashBy)} a year more` }, ` at ${F[cashWin].short}.`];
    }
  } else if ("v" in c0 && "v" in c1) {
    // one of the two has no price report this month, so no estimate: the two rates
    cashRuns = ["Cash interest: ", { fig: rate(c0.v) }, ` at ${A.short}, `, { fig: rate(c1.v) }, ` at ${B.short}.`];
  } else {
    // a rate that varies or isn't confirmed is named; a broker that doesn't offer interest on cash beside one paying a
    // rate (two at no interest are said above): the rate first, then the fee tables' "not offered"
    const odd = [0, 1].filter((i) => "w" in cash[i] && (cash[i] as { w: string }).w !== "not offered");
    const word = (i: number) => (cash[i] as { w: string }).w;
    if (!odd.length) {
      const p = "v" in c0 ? 0 : 1;
      cashRuns = ["Cash interest: ", { fig: rate((cash[p] as { v: number }).v) }, ` at ${F[p].short}, not offered at ${F[1 - p].short}.`];
    } else if (odd.length === 1) cashRuns = [`${F[odd[0]].short}'s cash interest ${isWord(word(odd[0]))}.`];
    else if (word(0) === word(1)) cashRuns = [word(0) === "varies" ? "Cash interest varies at both." : "Cash interest isn't confirmed at either."];
    else cashRuns = [`${A.short}'s cash interest ${isWord(word(0))}; ${B.short}'s ${isWord(word(1))}.`];
  }

  // moving out, compared on the cents shown
  let moveWin = -1, moveBy = 0, moveRuns: Run[];
  const [m0, m1] = move;
  if ("v" in m0 && "v" in m1) {
    const gap = Math.round(m1.v * 100) - Math.round(m0.v * 100); // above zero: moving out of A costs less
    if (gap === 0) moveRuns = [MOVING, { fig: fee$(m0.v) }, " at both."];
    else { moveWin = gap > 0 ? 0 : 1; moveBy = Math.abs(gap) / 100; moveRuns = [MOVING, { fig: `${fee$(moveBy)} less` }, ` at ${F[moveWin].short}.`]; }
  } else {
    const odd = [0, 1].filter((i) => "w" in move[i]);
    const word = (i: number) => (move[i] as { w: string }).w;
    if (odd.length === 1) moveRuns = [`${F[odd[0]].short}'s moving-out fee ${isWord(word(odd[0]))}.`];
    else if (word(0) === word(1)) moveRuns = [`The moving-out fee ${word(0) === "varies" ? "varies at both" : `${isWord(word(0))} at either`}.`];
    else moveRuns = [`${A.short}'s moving-out fee ${isWord(word(0))}; ${B.short}'s ${isWord(word(1))}.`];
  }

  // one broker better on both: one sentence
  if (cashWin >= 0 && cashWin === moveWin) {
    return line(`At ${F[cashWin].short}, $1,000 of cash earns `, { fig: `${yearly(cashBy)} a year more` }, " and moving out costs ", { fig: `${fee$(moveBy)} less` }, ".");
  }
  return line(...cashRuns, " ", ...moveRuns);
}
