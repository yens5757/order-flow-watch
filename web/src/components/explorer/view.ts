// The explorer's view: what it shows (a measure, and optionally a second one to plot it against) and for which orders and
// brokers. The whole view lives in the query string (brokers/?m=cost10k&vs=pay10k&ex=webull,moomoo), so a view can be
// linked; anything missing or odd in a link is the default. Pure: the pre-render and the browser read it the same way.
import { BUCKETS, idFromUrl, slugOf, type Data, type Ot, type Sp } from "../../lib/data";
import { dayLong } from "../../lib/format";
import { readQuery } from "../../lib/hooks";
import { METRIC_KEYS, METRICS, type MetricKey } from "../../lib/metrics";

export type Sort = "best" | "worst" | "az";
export interface View { m: MetricKey; vs: MetricKey | ""; sp: Sp; ot: Ot; b: number; q: string; sort: Sort; ex: string[]; paid: boolean; clr: boolean }

const isKey = (v: string | null): v is MetricKey => !!v && (METRIC_KEYS as string[]).includes(v);
/** Fee measures come from each broker's own price list (fees.csv), not from the Rule 605/606 reports: the order filters
 *  never touch them. */
export const isFee = (k: MetricKey | ""): boolean => k !== "" && METRICS[k].source === "published";
/** What the broker is paid: the only measures the payment quarter changes. */
export const isPay = (k: MetricKey | ""): boolean => k === "pay10k" || k === "payPct";

export const defaults = (d: Data): View =>
  ({ m: "cost10k", vs: "", sp: "Y", ot: "M", b: 199999, q: d.meta.quarter, sort: "best", ex: [], paid: false, clr: false });

/** The view a query string describes. */
export function fromUrl(d: Data, search: string): View {
  const p = readQuery(search), s = defaults(d);
  return {
    m: isKey(p.get("m")) ? (p.get("m") as MetricKey) : s.m,
    vs: isKey(p.get("vs")) && p.get("vs") !== p.get("m") ? (p.get("vs") as MetricKey) : "",
    sp: p.get("sp") === "N" ? "N" : "Y",
    ot: p.get("ot") === "ML" ? "ML" : "M",
    b: p.has("b") && BUCKETS.some(([b]) => b === Number(p.get("b"))) ? Number(p.get("b")) : s.b,
    q: d.meta.quarters.includes(p.get("q") ?? "") ? p.get("q")! : s.q,
    sort: (["best", "worst", "az"] as const).find((x) => x === p.get("sort")) ?? "best",
    // slugs (or reporter ids from older links) of the brokers hidden; unknown names are dropped
    ex: (p.get("ex") ?? "").split(",").map((x) => idFromUrl(d, x)).filter((x): x is string => x != null),
    paid: p.get("paid") === "1",
    clr: p.get("clr") === "1",
  };
}

/** The query that describes a view: only what differs from the default, brokers by their URL names. */
export function toQuery(d: Data, s: View) {
  const def = defaults(d);
  return {
    m: s.m !== def.m ? s.m : null, vs: s.vs || null, sp: s.sp !== "Y" ? s.sp : null, ot: s.ot !== "M" ? s.ot : null,
    b: s.b !== def.b ? s.b : null, q: s.q !== def.q ? s.q : null, sort: s.sort !== "best" ? s.sort : null,
    ex: s.ex.length ? s.ex.map((id) => slugOf(d, id)).join(",") : null, paid: s.paid ? 1 : null, clr: s.clr ? 1 : null,
  };
}

/** The measures as the pickers list them, in two groups; the fee group names the date the fees were checked, and a
 *  measure no broker has a figure for yet says so, so nobody picks it blind. */
export function measureGroups(d: Data, noData: (k: MetricKey) => boolean, leave?: MetricKey): [string, [MetricKey, string][]][] {
  const item = (k: MetricKey): [MetricKey, string] => [k, METRICS[k].label + (noData(k) ? " (no data yet)" : "")];
  const keys = METRIC_KEYS.filter((k) => k !== leave);
  return [
    ["Prices and payments", keys.filter((k) => !isFee(k)).map(item)],
    [`Fees${d.meta.feesChecked ? `, checked ${dayLong(d.meta.feesChecked)}` : ""}`, keys.filter(isFee).map(item)],
  ];
}

/** A figure as shown: a true minus sign, and no sign at all on a figure that rounds to zero ("−$0.00", "+0.0 pts" and
 *  "-0.0%" become "$0.00", "0.0 pts" and "0.0%"). */
export function tidy(s: string): string {
  const t = s.replace(/^-/, "−");
  return /^[−+]/.test(t) && !/[1-9]/.test(t) ? t.slice(1) : t;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
