// Names, colours and figures shared by the parts of the trading-firms page (pages/MarketMakers.tsx).
import type { Data } from "../../lib/data";
import { quarterLong } from "../../lib/format";

/** A quarter's name that never breaks across lines ("Jul–Sep 2026"): word joiners round the dash, a no-break space
 *  before the year. */
export const quarterName = (q: string) => quarterLong(q).replace("–", "⁠–⁠").replace(" ", " ");
/** "SEC Rule 606" on one line. */
export const RULE_606 = "SEC Rule 606";

/** A trading firm or venue without its legal suffix: "Citadel Securities" -> "Citadel", "Virtu Americas" -> "Virtu". */
export const trim = (n: string) => n.replace(/ (Securities|Americas|Financial|Execution|Services|LLC)$/, "");

/** A leading hyphen as a proper minus sign. */
const minus = (s: string) => s.replace(/^-/, "−");

/** A share of orders in a table cell: "27%", "<1%" for a sliver that would round to nothing, "0%". */
export const shareCell = (v: number) => (v > 0 && v < 0.5 ? "<1%" : `${v.toFixed(0)}%`);

/** Cents per 100 shares in a table cell: "165¢", "6.6¢" (one decimal under 10¢), "0¢", "−0.2¢". */
export const centsCell = (v: number) => (v === 0 ? "0¢" : `${minus(Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0))}¢`);

/** A share of the spread with one decimal and a proper minus: "18.5%", "−4.6%". */
export const spreadPct = (v: number) => `${minus(v.toFixed(1))}%`;

/** Each trading firm's colour slot (0–7, the series palette) on this page, so a firm keeps one colour in the volume lines
 *  and in every broker's ring: FINRA's firms in the order given (their latest share of off-exchange trading), then the
 *  trading firms FINRA does not list. Any other venue (an exchange, a broker's own affiliate) has no slot: it is grey. */
export function firmSlots(d: Data, finraOrder: string[]): Map<string, number> {
  const names = [...finraOrder, ...d.marketMakers.map((m) => m.name).filter((n) => !finraOrder.includes(n))];
  return new Map(names.slice(0, 8).map((n, i) => [n, i]));
}
