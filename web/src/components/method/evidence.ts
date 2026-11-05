// The evidence rows of site.json (build_site.py with stats.py): per stock group, each test's rank correlation (rho), its
// two-sided permutation p-value (10,000 shuffles), 95% bootstrap interval (3,000 resamples) and broker count. Pure, so the
// page's sentences, its summary table and the forest table all read one verdict and can never disagree.
import { andList, SP_GAP } from "../../lib/broker";
import type { Data, Evidence, Sp } from "../../lib/data";
import { signed } from "../../lib/format";

/** The tests by what they ask. raw, equal and same are the three payment tests (Home.tsx finds the first two by the same
 *  wording); the rest are what else might explain the prices. */
export type Kind = "raw" | "equal" | "same" | "clientele" | "speed" | "routing" | "improved";
const KINDS: [Kind, RegExp][] = [
  ["raw", /^Paid more → customers pay more of the spread/],
  ["equal", /^Paid more → customers pay more, at equal share price/],
  ["same", /^Paid more → worse prices on the same stocks/],
  ["clientele", /^Bigger typical order/],
  ["speed", /^Slower (fills|execution)/],
  ["routing", /^Routing mix/],
  ["improved", /^More orders price-improved/],
];
export const kindOf = (claim: string): Kind | null => KINDS.find(([, re]) => re.test(claim))?.[0] ?? null;
export const testOf = (d: Data, kind: Kind, sp: Sp): Evidence | undefined => d.evidence.find((e) => e.sp === sp && kindOf(e.claim) === kind);

/** The claim as shown: "Slower fills" is about speed, and the site says "prices", not "fills", for what customers got. */
export const claimText = (claim: string) => claim.replace(/^Slower fills\b/, "Slower execution");

/** good: under 0.05 and pointing the way the claim says · bad: under 0.05 the other way · neutral: 0.05 or more. */
export type Verdict = "good" | "bad" | "neutral";
export const verdictOf = (e: Evidence): Verdict => (e.p >= 0.05 ? "neutral" : Math.sign(e.rho) === e.expect ? "good" : "bad");
export const VERDICT: Record<Verdict, string> = { good: "Holds up", bad: "Goes the other way", neutral: "Could be chance" };
export const holds = (e: Evidence | undefined) => !!e && verdictOf(e) === "good";

/** A p-value as printed: under 0.001 as "<0.001" (none of the shuffles came close), three decimals below 0.1 where the
 *  0.05 line falls, two from there. */
export const pText = (p: number) => (p < 0.001 ? "<0.001" : p < 0.1 ? p.toFixed(3) : p.toFixed(2));
export const rhoText = (v: number) => signed(v, 2);
/** Where a value from −1 to +1 sits along the drawn rail, in percent. */
export const railAt = (v: number) => ((Math.max(-1, Math.min(1, v)) + 1) / 2) * 100;

export interface Group { sp: Sp; key: "sp" | "ot"; name: string; label: string }
export const GROUPS: Group[] = [
  { sp: "Y", key: "sp", name: `S&P${SP_GAP}500 stocks`, label: `S&P${SP_GAP}500 stocks` },
  { sp: "N", key: "ot", name: "other stocks", label: "Other stocks" },
];

/** The three payment tests, in the order the page lists them, with the words each one adds. */
export const PAY_TESTS: { kind: Kind; words: string }[] = [
  { kind: "raw", words: "across brokers' averages" },
  { kind: "equal", words: "at equal share price" },
  { kind: "same", words: "on the same stocks and order sizes" },
];

/** The answer to "do brokers paid more give worse prices?", from the three payment tests per stock group (the table
 *  beside it shows each one). A group counts as a yes only when the link holds in all three, so it survives holding share
 *  price equal and comparing the same stocks and order sizes; "Not reliably" otherwise, never "no". */
export function payAnswer(d: Data): { lead: string; yes: boolean } {
  const per = GROUPS.map((g) => ({ g, tests: PAY_TESTS.map((t) => testOf(d, t.kind, g.sp)).filter((e) => e != null) }))
    .filter((x) => x.tests.length);
  const robust = per.filter((x) => x.tests.length === PAY_TESTS.length && x.tests.every((e) => holds(e)));
  const lead = !per.length ? "Not tested yet."
    : robust.length === per.length ? "Yes, in this data."
      : robust.length ? `For ${andList(robust.map((x) => x.g.name))}, yes.`
        : "Not reliably.";
  return { lead, yes: robust.length > 0 };
}

/** The groups where a test holds up, by name ("S&P 500 stocks and other stocks" → "both stock groups"). */
export function whereHolds(d: Data, kind: Kind): string | null {
  const ok = GROUPS.filter((g) => holds(testOf(d, kind, g.sp)));
  return !ok.length ? null : ok.length === GROUPS.length ? "both stock groups" : andList(ok.map((g) => g.name));
}

/** The strongest link (|rho|) among a set of tests, over both groups. */
export const strongest = (d: Data, kinds: Kind[]) =>
  Math.max(0, ...d.evidence.filter((e) => { const k = kindOf(e.claim); return k != null && kinds.includes(k); }).map((e) => Math.abs(e.rho)));

/** One row of the forest table: a claim and its result in each group (absent when a group has too few brokers). */
export interface Row { claim: string; sp?: Evidence; ot?: Evidence }
export function rowsOf(d: Data): Row[] {
  const claims: string[] = [];
  for (const e of d.evidence) if (!claims.includes(e.claim)) claims.push(e.claim);
  return claims.map((claim) => ({
    claim,
    sp: d.evidence.find((e) => e.claim === claim && e.sp === "Y"),
    ot: d.evidence.find((e) => e.claim === claim && e.sp === "N"),
  }));
}
