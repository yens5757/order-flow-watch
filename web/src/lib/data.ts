// Types for public/data/site.json (written by build_site.py) and the lookups built from it.

export type Sp = "Y" | "N";
export type Ot = "M" | "ML";

export interface Firm { id: string; name: string; short: string; type: "broker" | "clearing_firm"; crd: string | null }
export interface ExecRow {
  id: string; m: string; sp: Sp; ot: Ot; b: number;
  efq: number | null; pi: number | null; aq: number | null; qs: number | null;
  sz: number | null; px: number | null; t: number | null; rs1: number | null;
}
export interface Venue { crd: string; q: string; sp: Sp; venue: string; share: Record<Ot, number | null>; cph: Record<Ot, number | null> }
export interface Usd { crd: string; q: string; seg: "SP500" | "OtherStocks" | "Options"; usd: number }
export interface Money { id: string; sp: Sp; cust: number; pay: number | null; mmKeeps: number | null; sz: number | null; t: number | null; pi: number | null }
export interface Gap { id: string; sp: Sp; gap: number; own: number; peers: number; cells: number }
export interface Implied { id: string; sp: Sp; actual: number; implied: number; coverage: number }
export interface Evidence { claim: string; sp: Sp; expect: 1 | -1; rho: number; p: number; lo: number; hi: number; n: number }
export interface Lot { id: string; sp: Sp; lot: "FRACT" | "ODD" | "ROUND"; efq: number; orders: number; dollars: number }
export interface Tier { id: string; kind: "ETF" | "Stock"; tier: 0 | 1 | 2 | 3; efq: number; dollars: number }
export interface OrderMix { id: string; orders: number; market: number | null; fractional: number | null }
export interface Otc { q: string; firm: string; share: number }
/** One broker's fee facts from fees.csv, checked by hand on its own pages; null = not published there or not verified.
 *  commission $ per stock trade, optionsFee $ per contract, marginRate % a year on $25k, cashYield % APY on idle cash, transferOut $ for a full transfer. */
export type FeeKey = "commission" | "optionsFee" | "marginRate" | "cashYield" | "transferOut";
export interface Fee {
  id: string; retail: boolean;
  commission: number | null; optionsFee: number | null; marginRate: number | null; cashYield: number | null; transferOut: number | null;
  /** fee facts that are null because the broker has no such product (Stash, Cash App and Wealthfront: no options trading), not because nobody checked */
  notOffered: FeeKey[];
  crd: string | null; sipc: boolean | null; sources: string[]; checked: string; confidence: "high" | "medium" | "low"; notes: string;
}

interface Raw {
  meta: {
    built: string; month: string; detailMonth: string; months: string[]; quarter: string; quarters: string[]; vix: Record<string, number>;
    /** unit of the 605 time fields (t): "ms" */
    timeUnit: string;
    /** date the fee facts were last checked (fees.csv), null if the file is empty */
    feesChecked: string | null;
  };
  firms: Firm[];
  marketMakers: { id: string; name: string }[];
  reporters: Record<string, { name: string; cat: string }>;
  execCols: string[];
  exec: (string | number | null)[][];
  pay: [string, string, Sp, number | null, number | null][];
  usd: [string, string, Usd["seg"], number][];
  venues: [string, string, Sp, string, number | null, number | null, number | null, number | null][];
  money: Money[];
  sameStock: { brokers: Gap[]; marketMakers: Gap[] };
  implied: Implied[];
  evidence: Evidence[];
  lots: Lot[];
  tiers: Tier[];
  orderMix: OrderMix[];
  otc: Otc[];
  fees: Fee[];
}

export interface Data extends Omit<Raw, "exec" | "pay" | "usd" | "venues" | "fees"> {
  exec: Map<string, ExecRow>;
  pay: Map<string, Record<Ot, number | null>>;
  usd: Usd[];
  venues: Venue[];
  byId: Record<string, Firm>;
  brokers: Firm[];
  /** by reporter id; brokers without a fees.csv row are absent */
  fees: Record<string, Fee>;
}

export async function loadData(): Promise<Data> {
  const res = await fetch("./data/site.json");
  if (!res.ok) throw new Error(`Could not load data (${res.status}). Run build_site.py first.`);
  const raw: Raw = await res.json();
  const exec = new Map<string, ExecRow>();
  for (const r of raw.exec) {
    const o = Object.fromEntries(raw.execCols.map((c, i) => [c, r[i]])) as unknown as ExecRow;
    exec.set(execKey(o.id, o.m, o.sp, o.ot, o.b), o);
  }
  return {
    ...raw,
    exec,
    pay: new Map(raw.pay.map(([crd, q, sp, m, ml]) => [`${crd}|${q}|${sp}`, { M: m, ML: ml }])),
    usd: raw.usd.map(([crd, q, seg, usd]) => ({ crd, q, seg, usd })),
    venues: raw.venues.map(([crd, q, sp, venue, mkt, ml, mc, mlc]) => ({ crd, q, sp, venue, share: { M: mkt, ML: ml }, cph: { M: mc, ML: mlc } })),
    byId: Object.fromEntries(raw.firms.map((f) => [f.id, f])),
    brokers: raw.firms.filter((f) => f.type === "broker"),
    fees: Object.fromEntries(raw.fees.map((x) => [x.id, x])),
  };
}

export const execKey = (id: string, m: string, sp: Sp, ot: Ot, b: number) => `${id}|${m}|${sp}|${ot}|${b}`;
export const nameOf = (f: Firm) => f.short + (f.type === "clearing_firm" ? " (clearing)" : "");

export const BUCKETS: [number, string][] = [
  [0, "Under $250"], [250, "$250–1k"], [1000, "$1k–5k"], [5000, "$5k–10k"], [10000, "$10k–20k"],
  [20000, "$20k–50k"], [50000, "$50k–200k"], [199999, "All under $200k"], [200000, "$200k and over"],
];
export const BUCKET_LABEL = Object.fromEntries(BUCKETS) as Record<number, string>;
export const SIZE_STEPS = [0, 250, 1000, 5000, 10000, 20000, 50000, 200000];
export const SP_LABEL: Record<Sp, string> = { Y: "S&P 500", N: "Other stocks" };
export const OT_LABEL: Record<Ot, string> = { M: "Market", ML: "Marketable limit" };

export interface Filters { sp: Sp; ot: Ot; b: number; month: string; quarter: string; clearing: boolean }

/** One broker under the current filters: what it is paid and what its customers pay, both % of spread. */
export interface Metric {
  f: Firm; id: string; name: string;
  payPct: number | null; cph: number | null; cust: number | null;
  pi: number | null; aq: number | null; sz: number | null; px: number | null; t: number | null; qsBps: number | null;
  /** $ the customer pays above the midpoint on a $10,000 trade */
  cost10k: number | null;
  /** $ the broker is paid for routing a $10,000 order: cph is cents per 100 shares, so cph/1e4 per share × 1e4/price shares */
  pay10k: number | null;
  /** points of the spread vs other brokers on identical stock × size cells (market orders, all sizes) */
  gap: number | null;
  /** average time to fill in milliseconds (meta.timeUnit); the same value as t */
  speedMs: number | null;
  /** from fees.csv (see Fee): null when the broker has no row or the fact is not verified */
  commission: number | null; optionsFee: number | null; marginRate: number | null; cashYield: number | null; transferOut: number | null;
}

export function metric(d: Data, f: Firm, s: Filters): Metric {
  const e = d.exec.get(execKey(f.id, s.month, s.sp, s.ot, s.b));
  const base = d.exec.get(execKey(f.id, s.month, s.sp, s.ot, 199999));
  const p = f.crd ? d.pay.get(`${f.crd}|${s.quarter}|${s.sp}`) : undefined;
  const cph = p ? p[s.ot] : null;
  const payPct = cph != null && base?.px && base?.qs ? cph / base.px / base.qs / 100 : null;
  const pct = (v: number | null | undefined) => (v == null ? null : v * 100);
  const qsBps = base?.qs != null ? base.qs * 1e4 : null;
  const cust = pct(e?.efq);
  const fee: Fee | undefined = d.fees[f.id];
  return {
    f, id: f.id, name: nameOf(f), payPct, cph, cust,
    pi: pct(e?.pi), aq: pct(e?.aq), sz: e?.sz ?? null, px: e?.px ?? null, t: e?.t ?? null, qsBps,
    cost10k: cust != null && qsBps != null ? (cust / 100) * (qsBps / 2) : null,
    pay10k: cph != null && base?.px ? cph / base.px : null,
    gap: d.sameStock.brokers.find((g) => g.id === f.id && g.sp === s.sp && g.cells >= 100)?.gap ?? null,
    speedMs: e?.t ?? null,
    commission: fee?.commission ?? null, optionsFee: fee?.optionsFee ?? null, marginRate: fee?.marginRate ?? null,
    cashYield: fee?.cashYield ?? null, transferOut: fee?.transferOut ?? null,
  };
}

export function brokerRows(d: Data, s: Filters): Metric[] {
  return d.firms
    .filter((f) => s.clearing || f.type !== "clearing_firm")
    .map((f) => metric(d, f, s))
    .filter((r) => r.cust != null);
}

/** A 606 is on file when any quarter has routing, payment-rate or dollar rows under this CRD. A CRD alone proves nothing:
 *  five brokers (Albert, Avenue, eToro, WF FiNet, Coinbase) have one from fees.csv but file no 606 of their own. */
export const files606 = (d: Data, crd: string | null) =>
  crd != null && (d.venues.some((v) => v.crd === crd) || d.usd.some((u) => u.crd === crd) || [...d.pay.keys()].some((k) => k.startsWith(`${crd}|`)));
