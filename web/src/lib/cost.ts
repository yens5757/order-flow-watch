// Yearly cost of trading at each broker from a visitor's own habits: the spread paid on trade prices, commissions,
// options fees, interest lost on idle cash and margin interest. The calculator page and the home-page estimator both use it.
import { metric, SIZE_STEPS, type Data, type Sp } from "./data";

/** What the visitor tells us: trades per year, typical $ size, spMix = percent of trades in S&P 500 stocks (0-100),
 *  options contracts per year, $ typically sitting uninvested, $ typically borrowed on margin. */
export interface CostInputs { trades: number; size: number; spMix: number; options: number; idleCash: number; margin: number }

/** One broker's yearly cost in $, split by source. `missing` names the parts no fee fact exists for (left out of the total);
 *  the values are the labels in PARTS[].facts, so the UI can tell which part each one belongs to. `gaps` is the subset
 *  other brokers do have: a fact nobody has verified yet (today: interest on idle cash) changes no ranking and is reported once. */
export interface CostLine {
  id: string; name: string; short: string;
  total: number; spread: number; commissions: number; optionsFees: number; cashDrag: number; marginInterest: number;
  missing: string[];
  gaps: string[];
}

/** No idle cash and no margin by default: those costs only count once the visitor says they have them (the broker pages'
 *  yearly figure uses the same habit, lib/broker.ts HABIT, so every page agrees on what a year costs). */
export const DEFAULT_INPUTS: CostInputs = { trades: 24, size: 2000, spMix: 50, options: 0, idleCash: 0, margin: 0 };

/** Each input's key in the calculator's query string (calculator/?n=24&s=2000&mix=50&o=0&c=5000&m=0&b=robinhood). */
export const CALC_KEYS: [keyof CostInputs, string][] = [["trades", "n"], ["size", "s"], ["spMix", "mix"], ["options", "o"], ["idleCash", "c"], ["margin", "m"]];

/** The calculator's query for a set of inputs and a broker's slug: only the inputs that differ from the defaults, so a
 *  key a link leaves out means the default. A link always names at least one input (n= when every input is a default),
 *  so it opens on exactly these inputs, never on the recipient's own saved ones (calculator/?n=24&b=robinhood). */
export const calcQuery = (inp: CostInputs, slug: string): Record<string, string | number | null> => {
  const q: Record<string, string | number | null> = Object.fromEntries(CALC_KEYS.map(([field, key]) => [key, inp[field] !== DEFAULT_INPUTS[field] ? inp[field] : null]));
  if (Object.values(q).every((v) => v == null)) q.n = inp.trades;
  return { ...q, b: slug };
};

/** The same query as a string ("?c=0&b=robinhood"), for a link into the calculator that opens on exactly these inputs. */
export function calcSearch(inp: CostInputs, slug: string): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(calcQuery(inp, slug))) if (v != null) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export type PartKey = "spread" | "commissions" | "optionsFees" | "cashDrag" | "marginInterest";
/** The five parts of the total in stack order, each with its series colour slot (t.s[slot]) and the `missing` labels it owns.
 *  Slots follow metrics.ts where the stack stays colourblind-safe (validated in both modes): options takes slot 6 (purple)
 *  because red fails next to every warm neighbour, and margin slot 3 (gold) so the legend doesn't carry two greens. */
export const PARTS: { key: PartKey; label: string; slot: number; facts: string[] }[] = [
  { key: "spread", label: "Trade prices", slot: 1, facts: ["S&P 500 prices", "other-stock prices"] },
  { key: "commissions", label: "Commissions", slot: 2, facts: ["commission"] },
  { key: "optionsFees", label: "Options fees", slot: 6, facts: ["options fee", "options (not offered)"] },
  { key: "cashDrag", label: "Idle cash", slot: 4, facts: ["cash yield"] },
  { key: "marginInterest", label: "Margin interest", slot: 3, facts: ["margin rate"] },
];

/** The 605 order-size bucket a $ size falls in: the largest step at or below it (0 for anything under $250, 200000 from $200k). */
export function bucketFor(size: number): number {
  let b = 0;
  if (Number.isFinite(size)) for (const s of SIZE_STEPS) if (size >= s) b = s;
  return b;
}

/** Inputs arrive from text boxes and the URL: anything that is not a finite positive number counts as 0. */
const clean = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/** The facts missing on every line: left out everywhere, so they change no order and are noted once. */
export const nobodyHas = (lines: { missing: string[] }[]) =>
  PARTS.flatMap((p) => p.facts).filter((f) => lines.length > 0 && lines.every((l) => l.missing.includes(f)));

/** One line per broker with 605 data: complete estimates first, cheapest first within each group. */
export function annualCost(d: Data, inp: CostInputs): CostLine[] {
  const trades = clean(inp.trades), size = clean(inp.size), options = clean(inp.options), idleCash = clean(inp.idleCash), margin = clean(inp.margin);
  const spMix = Math.min(100, clean(inp.spMix));
  const weight: Record<Sp, number> = { Y: spMix / 100, N: 1 - spMix / 100 };
  const b = bucketFor(size);
  const base = { ot: "M" as const, month: d.meta.month, quarter: d.meta.quarter, clearing: false };
  // the best verified yield sets the bar: the broker paying it loses nothing, every other one gives up the difference
  const yields = Object.values(d.fees).map((x) => x.cashYield).filter((v): v is number => v != null);
  const bestYield = yields.length ? Math.max(...yields) : null;

  const lines: CostLine[] = [];
  for (const f of d.brokers) {
    const missing: string[] = [];
    // $ paid above the fair price per $ traded in one stock group; the all-sizes row stands in when a sub-$200k bucket has no
    // data, never for $200k+ orders (a different market: prices there are far worse, so the small-order average would flatter)
    const perDollar = (sp: Sp): number | null => {
      for (const bucket of b < 200000 ? [b, 199999] : [b]) {
        const c = metric(d, f, { ...base, sp, b: bucket }).cost10k;
        if (c != null && Number.isFinite(c)) return c / 1e4;
      }
      return null;
    };
    let spread = 0, known = false;
    for (const sp of ["Y", "N"] as Sp[]) {
      if (weight[sp] === 0) continue;
      const c = perDollar(sp);
      if (c == null) { missing.push(sp === "Y" ? "S&P 500 prices" : "other-stock prices"); continue; }
      known = true;
      spread += trades * size * c * weight[sp];
    }
    if (!known) continue; // no 605 cost for any stock group the visitor trades: nothing to estimate

    const fee = d.fees[f.id];
    // a part only counts as missing when the visitor actually uses it (no options traded = no options fee needed)
    const part = (amount: number, rate: number | null, fact: string) => {
      if (amount === 0) return 0;
      if (rate == null) { missing.push(fact); return 0; }
      return amount * rate;
    };
    const commissions = part(trades, fee?.commission ?? null, "commission");
    const optionsFees = part(options, fee?.optionsFee ?? null, fee?.notOffered.includes("optionsFee") ? "options (not offered)" : "options fee");
    const cashDrag = part(idleCash, bestYield != null && fee?.cashYield != null ? (bestYield - fee.cashYield) / 100 : null,
      fee?.notOffered.includes("cashYield") ? "cash yield (not offered)" : fee?.varies.includes("cashYield") ? "cash yield (varies)" : "cash yield");
    const marginInterest = part(margin, fee?.marginRate != null ? fee.marginRate / 100 : null, fee?.varies.includes("marginRate") ? "margin rate (varies)" : "margin rate");
    lines.push({
      id: f.id, name: f.name, short: f.short,
      total: spread + commissions + optionsFees + cashDrag + marginInterest,
      spread, commissions, optionsFees, cashDrag, marginInterest, missing, gaps: [],
    });
  }
  const nobody = nobodyHas(lines);
  for (const l of lines) l.gaps = l.missing.filter((f) => !nobody.includes(f));
  return lines.sort((x, y) => Number(x.gaps.length > 0) - Number(y.gaps.length > 0) || x.total - y.total);
}
