// The measures a visitor can pick in the explorer, in plain words, with which direction is "better".
import type { Metric } from "./data";
import { num, pct, signed, usd2, usdTick } from "./format";

export type MetricKey = "cost10k" | "cust" | "pay10k" | "payPct" | "gap" | "pi" | "sz";

export interface MetricDef {
  label: string;
  /** the measure as a noun phrase, for generated sentences */
  noun: string;
  short: string;
  desc: string;
  better: "low" | "high" | null;
  get: (r: Metric) => number | null;
  fmt: (v: number | null) => string;
  axis: (v: number) => string;
  /** series colour slot (index into the categorical palette) */
  slot: number;
  diverging?: boolean;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  cost10k: {
    label: "Extra cost on a $10,000 trade", noun: "extra cost on a $10,000 trade", short: "Extra cost / $10k",
    desc: "Dollars paid above the fair price (the midpoint between the best buy and sell quotes). Lower is better.",
    better: "low", get: (r) => r.cost10k, fmt: usd2, axis: usdTick, slot: 1,
  },
  cust: {
    label: "Share of the spread customers pay", noun: "share of the spread its customers pay", short: "Spread paid",
    desc: "0% means filled at the fair price, 100% means paying the full gap between buy and sell quotes. Lower is better.",
    better: "low", get: (r) => r.cust, fmt: (v) => pct(v, 1), axis: (v) => `${v}%`, slot: 1,
  },
  pay10k: {
    label: "Paid to the broker per $10,000 order", noun: "payment per $10,000 order", short: "Broker paid / $10k",
    desc: "What trading firms pay the broker for sending them a $10,000 order (payment for order flow).",
    better: null, get: (r) => r.pay10k, fmt: usd2, axis: usdTick, slot: 0,
  },
  payPct: {
    label: "Paid to the broker, as a share of the spread", noun: "payment as a share of the spread", short: "Broker paid (% spread)",
    desc: "The same payment in the same unit as the customer's cost, so the two can be compared directly.",
    better: null, get: (r) => r.payPct, fmt: (v) => pct(v, 1), axis: (v) => `${v}%`, slot: 0,
  },
  gap: {
    label: "Price on identical trades vs other brokers", noun: "price gap on identical trades", short: "Same-trade gap",
    desc: "Points of the spread, comparing the exact same stocks and order sizes. Below zero = better than other brokers.",
    better: "low", get: (r) => r.gap, fmt: (v) => signed(v, 1), axis: (v) => `${v > 0 ? "+" : ""}${v}`, slot: 0, diverging: true,
  },
  pi: {
    label: "Orders that beat the quoted price", noun: "share of orders beating the quoted price", short: "Price-improved",
    desc: "Share of orders filled at least slightly better than quoted. Brokers advertise it, but it says little about how much you save.",
    better: "high", get: (r) => r.pi, fmt: (v) => pct(v, 0), axis: (v) => `${v}%`, slot: 2,
  },
  sz: {
    label: "Typical order size", noun: "typical order size", short: "Avg order (shares)",
    desc: "Average shares per order. Brokers whose customers trade bigger tend to get better prices.",
    better: null, get: (r) => r.sz, fmt: (v) => (v == null ? "–" : `${num(v)} sh`), axis: (v) => num(v), slot: 6,
  },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];
