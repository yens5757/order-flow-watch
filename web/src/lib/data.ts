// Types for public/data/site.json (written by build_site.py) and the lookups built from it.

export type Sp = "Y" | "N";
export type Ot = "M" | "ML";

/** `slug` names the firm in URLs (brokers/<slug>/, compare/<a>-vs-<b>/): the short name lower-cased, "&" -> "and", any run of
 *  other characters -> "-" (dots and asterisks dropped: jp-morgan, etrade), unique across firms. build_site.py writes it;
 *  until it does, `buildData` derives it from `short` by the same rule. */
export interface Firm { id: string; name: string; short: string; type: "broker" | "clearing_firm"; crd: string | null; slug: string }
export interface ExecRow {
  id: string; m: string; sp: Sp; ot: Ot; b: number;
  efq: number | null; pi: number | null; aq: number | null; qs: number | null;
  sz: number | null; px: number | null; t: number | null; rs1: number | null;
}
export interface Venue { crd: string; q: string; sp: Sp; venue: string; share: Record<Ot, number | null>; cph: Record<Ot, number | null> }
export interface Usd { crd: string; q: string; seg: "SP500" | "OtherStocks" | "Options"; usd: number }
export interface Money { id: string; sp: Sp; cust: number; pay: number | null; payQ?: string | null; mmKeeps: number | null; sz: number | null; t: number | null; pi: number | null }
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
  /** fee facts that are null because the rate depends on a balance tier, a program or a separate product (IBKR cash interest, Merrill margin) */
  varies: FeeKey[];
  crd: string | null; sipc: boolean | null; sources: string[]; checked: string; confidence: "high" | "medium" | "low"; notes: string;
}

/** site.json as written: what `fetch` returns and what the pre-render reads from disk. `buildData` turns it into `Data`. */
export interface Raw {
  meta: {
    built: string; month: string; detailMonth: string; months: string[]; quarter: string; quarters: string[]; vix: Record<string, number>;
    /** unit of the 605 time fields (t): "ms" */
    timeUnit: string;
    /** brokers whose payment comes from the previous quarter because they have not filed the latest one yet */
    payFallback?: string[];
    /** date the fee facts were last checked (fees.csv), null if the file is empty */
    feesChecked: string | null;
  };
  firms: (Omit<Firm, "slug"> & { slug?: string })[];
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

export interface Data extends Omit<Raw, "exec" | "pay" | "usd" | "venues" | "fees" | "firms"> {
  firms: Firm[];
  exec: Map<string, ExecRow>;
  pay: Map<string, Record<Ot, number | null>>;
  usd: Usd[];
  venues: Venue[];
  byId: Record<string, Firm>;
  /** by URL slug */
  bySlug: Record<string, Firm>;
  brokers: Firm[];
  /** by reporter id; brokers without a fees.csv row are absent */
  fees: Record<string, Fee>;
}

/** The URL slug of a short name: "J.P. Morgan" -> jp-morgan, "E*TRADE" -> etrade, "Cash App" -> cash-app, "WF FiNet" -> wf-finet. */
export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[.*'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** The lookups the pages use, from site.json as written. Pure: the pre-render calls it with the file read from disk. */
export function buildData(raw: Raw): Data {
  const exec = new Map<string, ExecRow>();
  for (const r of raw.exec) {
    const o = Object.fromEntries(raw.execCols.map((c, i) => [c, r[i]])) as unknown as ExecRow;
    exec.set(execKey(o.id, o.m, o.sp, o.ot, o.b), o);
  }
  // slugs from the file, or derived from the short name until build_site.py writes them; unique either way
  const taken = new Set<string>();
  const firms: Firm[] = raw.firms.map((f) => {
    const base = f.slug || slugify(f.short) || f.id.toLowerCase();
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    taken.add(slug);
    return { ...f, slug };
  });
  return {
    ...raw,
    firms,
    exec,
    pay: new Map(raw.pay.map(([crd, q, sp, m, ml]) => [`${crd}|${q}|${sp}`, { M: m, ML: ml }])),
    usd: raw.usd.map(([crd, q, seg, usd]) => ({ crd, q, seg, usd })),
    venues: raw.venues.map(([crd, q, sp, venue, mkt, ml, mc, mlc]) => ({ crd, q, sp, venue, share: { M: mkt, ML: ml }, cph: { M: mc, ML: mlc } })),
    byId: Object.fromEntries(firms.map((f) => [f.id, f])),
    bySlug: Object.fromEntries(firms.map((f) => [f.slug, f])),
    brokers: firms.filter((f) => f.type === "broker"),
    fees: Object.fromEntries(raw.fees.map((x) => [x.id, x])),
  };
}

/** `Data` whether given the built lookups or the raw file (a caller that skipped `buildData`). */
export const asData = (x: Data | Raw): Data => ("byId" in x ? x : buildData(x));

/** Fetches site.json from under the site's base (the browser; the pre-render reads the file instead). */
export async function loadData(): Promise<Data> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/site.json`);
  if (!res.ok) throw new Error(`Could not load data (${res.status}). Run build_site.py first.`);
  return buildData((await res.json()) as Raw);
}

export const execKey = (id: string, m: string, sp: Sp, ot: Ot, b: number) => `${id}|${m}|${sp}|${ot}|${b}`;
export const nameOf = (f: Firm) => f.short + (f.type === "clearing_firm" ? " (clearing)" : "");
/** A firm's URL slug by reporter id (the id itself, lower-cased, for one not in site.json). */
export const slugOf = (d: Data, id: string) => d.byId[id]?.slug ?? id.toLowerCase();
/** A reporter id from a URL value: a slug, or an id from a link written before slugs existed; null when it is neither. */
export const idFromUrl = (d: Data, v: string | null | undefined): string | null => (v ? (d.bySlug[v] ?? d.byId[v])?.id ?? null : null);

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
  /** the quarter the payment comes from (the one before the selected quarter when the broker has not filed it yet) */
  payQ: string | null;
  pi: number | null; aq: number | null; sz: number | null; px: number | null; t: number | null; qsBps: number | null;
  /** $ the customer pays above the midpoint on a $10,000 trade */
  cost10k: number | null;
  /** $ the broker is paid per $10,000 of orders it routes: cph is cents per 100 shares, so cph/1e4 per share × 1e4/price shares */
  pay10k: number | null;
  /** points of the spread vs other brokers on the same stock × lot × size cells (market orders, all sizes) */
  gap: number | null;
  /** average time to fill in milliseconds (meta.timeUnit); the same value as t */
  speedMs: number | null;
  /** points of the spread its customers paid on fractional-share orders minus whole-share orders (odd and round lots,
   *  dollar-weighted): plain market orders under $200,000 in meta.detailMonth (Lot rows); null without both kinds */
  fract: number | null;
  /** from fees.csv (see Fee): null when the broker has no row or the fact is not verified */
  commission: number | null; optionsFee: number | null; marginRate: number | null; cashYield: number | null; transferOut: number | null;
}

export function metric(d: Data, f: Firm, s: Filters): Metric {
  const e = d.exec.get(execKey(f.id, s.month, s.sp, s.ot, s.b));
  const base = d.exec.get(execKey(f.id, s.month, s.sp, s.ot, 199999));
  // the selected quarter's payment; on the latest quarter, the one before for a broker that has not filed it yet
  // (build_site.py does the same for the evidence table, so every page agrees)
  const payAt = (q: string | undefined) => (f.crd && q ? d.pay.get(`${f.crd}|${q}|${s.sp}`) : undefined);
  const prevQ = d.meta.quarters[d.meta.quarters.indexOf(s.quarter) - 1];
  const own = payAt(s.quarter);
  const p = own ?? (s.quarter === d.meta.quarter ? payAt(prevQ) : undefined);
  const payQ = own ? s.quarter : p ? prevQ : null;
  const cph = p ? p[s.ot] : null;
  const payPct = cph != null && base?.px && base?.qs ? cph / base.px / base.qs / 100 : null;
  const pct = (v: number | null | undefined) => (v == null ? null : v * 100);
  const qsBps = base?.qs != null ? base.qs * 1e4 : null;
  const cust = pct(e?.efq);
  const fee: Fee | undefined = d.fees[f.id];
  // fractional vs whole shares, from the detailed report's lot types (one month, plain market orders, all sizes under $200k)
  const lots = d.lots.filter((l) => l.id === f.id && l.sp === s.sp);
  const fr = lots.find((l) => l.lot === "FRACT"), whole = lots.filter((l) => l.lot !== "FRACT" && l.dollars > 0);
  const wholeDollars = whole.reduce((a, l) => a + l.dollars, 0);
  const fract = fr && wholeDollars > 0 ? fr.efq - whole.reduce((a, l) => a + l.efq * l.dollars, 0) / wholeDollars : null;
  return {
    f, id: f.id, name: nameOf(f), payPct, cph, payQ, cust,
    pi: pct(e?.pi), aq: pct(e?.aq), sz: e?.sz ?? null, px: e?.px ?? null, t: e?.t ?? null, qsBps,
    cost10k: cust != null && qsBps != null ? (cust / 100) * (qsBps / 2) : null,
    pay10k: cph != null && base?.px ? cph / base.px : null,
    gap: d.sameStock.brokers.find((g) => g.id === f.id && g.sp === s.sp && g.cells >= 100)?.gap ?? null,
    speedMs: e?.t ?? null,
    fract,
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
