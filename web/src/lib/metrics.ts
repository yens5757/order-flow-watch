// The measures a visitor can pick in the explorer, in plain words, with which direction is "better".
// Every page names a measure through METRICS[k].label / .short, so one noun per measure holds across the site:
// "Customer pays" (share of the spread, or "per $10,000 traded" in dollars), "Broker is paid", "Same-stock gap" (never
// "same trade": brokers are compared on the same stocks and order sizes, not on identical trades).
import type { Metric } from "./data";
import { ms, num, pct, signed, usd2, usdTick } from "./format";

/** The reference price, glossed the same way wherever it is first used on a page. */
export const FAIR_PRICE = "the fair price (midpoint of the best buy and sell quotes)";

export type MetricKey = "cost10k" | "cust" | "pay10k" | "payPct" | "gap" | "pi" | "sz" | "speed" | "fract" | "commission" | "optionsFee" | "marginRate" | "cashYield";

export interface MetricDef {
  label: string;
  /** the measure as a noun phrase, for generated sentences */
  noun: string;
  short: string;
  desc: string;
  better: "low" | "high" | null;
  /** measured = from the 605/606 reports (follows the order filters); published = a fee read from the broker's own pages */
  source: "measured" | "published";
  get: (r: Metric) => number | null;
  fmt: (v: number | null) => string;
  axis: (v: number) => string;
  /** series colour slot (index into the categorical palette) */
  slot: number;
  diverging?: boolean;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  cost10k: {
    label: "Extra cost per $10,000 traded", noun: "extra cost per $10,000 traded", short: "Extra cost / $10k",
    desc: `Dollars paid above ${FAIR_PRICE} per $10,000 of market orders, all sizes under $200,000 averaged (largest orders weigh most); lower is better.`,
    better: "low", source: "measured", get: (r) => r.cost10k, fmt: usd2, axis: usdTick, slot: 1,
  },
  cust: {
    label: "Customer pays, as a share of the spread", noun: "share of the spread its customers pay", short: "Customer pays (% spread)",
    desc: "0% = you got the fair price, 100% = you traded at the quoted price; lower is better.",
    better: "low", source: "measured", get: (r) => r.cust, fmt: (v) => pct(v, 1), axis: (v) => `${v}%`, slot: 1,
  },
  pay10k: {
    label: "Broker is paid, per $10,000 order", noun: "payment per $10,000 order", short: "Broker is paid / $10k",
    desc: "What trading firms pay the broker for a $10,000 order (payment for order flow).",
    better: null, source: "measured", get: (r) => r.pay10k, fmt: usd2, axis: usdTick, slot: 0,
  },
  payPct: {
    label: "Broker is paid, as a share of the spread", noun: "payment as a share of the spread", short: "Broker is paid (% spread)",
    desc: "The payment as a share of the bid–ask gap. Customer pays is on the SEC's effective/quoted scale, which counts the distance from the midpoint twice, so compare the two in dollars per $10,000.",
    better: null, source: "measured", get: (r) => r.payPct, fmt: (v) => pct(v, 1), axis: (v) => `${v}%`, slot: 0,
  },
  gap: {
    label: "Same-stock gap vs other brokers", noun: "same-stock gap", short: "Same-stock gap",
    desc: "Points of the spread vs other brokers on the same stocks and order sizes; below zero = better.",
    better: "low", source: "measured", get: (r) => r.gap, fmt: (v) => signed(v, 1), axis: (v) => `${v > 0 ? "+" : ""}${v}`, slot: 0, diverging: true,
  },
  // no "better" direction: Webull price-improves 94% of orders yet its customers still pay about half the spread
  pi: {
    label: "Orders that beat the quoted price", noun: "share of orders beating the quoted price", short: "Price-improved",
    desc: "Share of orders filled at least slightly better than quoted; it says little about how much you save, so it is context, not a score.",
    better: null, source: "measured", get: (r) => r.pi, fmt: (v) => pct(v, 0), axis: (v) => `${v}%`, slot: 2,
  },
  sz: {
    label: "Typical order size", noun: "typical order size", short: "Avg order ($)",
    desc: "Average dollars per order; brokers whose customers place bigger orders tend to get better prices.",
    better: null, source: "measured", get: (r) => r.sz, fmt: (v) => (v == null ? "–" : `$${num(v)}`), axis: (v) => `$${num(v)}`, slot: 6,
  },
  speed: {
    label: "Average execution speed", noun: "average execution speed", short: "Time to fill",
    desc: "Average time from receiving a market order to completing it; faster is not better here, as brokers whose orders took longer got better prices.",
    better: null, source: "measured", get: (r) => r.speedMs, fmt: ms, axis: (v) => ms(v), slot: 3,
  },
  // context, not a score: it compares a broker with itself, and some brokers' customers buy fractional shares far more often.
  // Violet (shared with order size and the options fee, rarely shown together): red or green would read as a verdict.
  fract: {
    label: "Fractional vs whole shares", noun: "extra paid on fractional-share orders", short: "Fractional vs whole",
    desc: "Points of the spread customers paid on fractional-share orders minus whole-share orders (market orders under $200,000, from the detailed monthly report); above zero = fractional orders got worse prices.",
    better: null, source: "measured", get: (r) => r.fract, fmt: (v) => signed(v, 1, " pts"), axis: (v) => `${v > 0 ? "+" : ""}${v}`, slot: 6,
  },
  // the fee measures come from fees.csv, checked by hand on each broker's own pages; brokers without a verified fact are left out.
  // Their colour slots match the calculator's stack (PARTS in lib/cost.ts), where the set was checked for colour-blind safety.
  commission: {
    label: "Commission per stock trade", noun: "commission per stock trade", short: "Stock commission",
    desc: "Dollars per online stock or ETF trade; nearly every broker charges $0, so the real cost is in the price you get.",
    better: "low", source: "published", get: (r) => r.commission, fmt: usd2, axis: usdTick, slot: 2,
  },
  optionsFee: {
    label: "Options fee per contract", noun: "options fee per contract", short: "Options / contract",
    desc: "Dollars per options contract to open a trade, on top of any per-trade commission.",
    better: "low", source: "published", get: (r) => r.optionsFee, fmt: usd2, axis: usdTick, slot: 6,
  },
  marginRate: {
    label: "Margin interest rate", noun: "margin interest rate", short: "Margin rate",
    desc: "Yearly interest on a $25,000 margin loan.",
    better: "low", source: "published", get: (r) => r.marginRate, fmt: (v) => pct(v, 2), axis: (v) => `${v}%`, slot: 3,
  },
  cashYield: {
    label: "Interest on idle cash", noun: "interest paid on idle cash", short: "Cash yield",
    desc: "Yearly interest (APY) on uninvested cash in a standard account.",
    better: "high", source: "published", get: (r) => r.cashYield, fmt: (v) => pct(v, 2), axis: (v) => `${v}%`, slot: 4,
  },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];
