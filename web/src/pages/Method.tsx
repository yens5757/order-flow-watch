import { useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { forest } from "../charts/options";
import { Card, Icon, PageHeader, Segmented, Status } from "../components/ui";
import type { Data, Evidence, Sp } from "../lib/data";
import { dayLong, monthLong, quarterLong, signed, strength } from "../lib/format";
import { METRICS } from "../lib/metrics";
import { useTheme } from "../lib/theme";

const verdict = (e: Evidence) => (e.p >= 0.05 ? "neutral" : Math.sign(e.rho) === e.expect ? "good" : "bad") as "good" | "bad" | "neutral";
const VERDICT = { good: "Supported", bad: "Contradicted", neutral: "Not significant" };

const STEPS = [
  ["download", "Fetch", "Rule 605 reports from public.s3.com and the market makers' sites, FINRA 606 bulk files, FINRA OTC volume, SEC EDGAR"],
  ["database", "Parse", "Hundreds of CSV, XML and pipe-delimited files into DuckDB, about 5M rows a month"],
  ["flask", "Analyse", "SQL joins, same-stock comparisons, rank correlations, permutation tests, bootstrap intervals"],
  ["globe", "Publish", "GitHub Actions rebuilds this site every Monday; raw data never leaves the cache"],
] as const;

const CAVEATS = [
  ["Small sample", "Fewer than 20 brokers report both payments and fills, so every test has low power. These are correlations, not causes."],
  ["Timing", "Fills are monthly (Rule 605); payments are quarterly (Rule 606), so the latest payments can lag the fills by a quarter."],
  ["Missing payments", "Albert, Avenue, Coinbase, eToro, Stash and WF FiNet file no 606 of their own. SoFi reports only its share, so its payment is understated. moomoo's payment is its routing affiliate Futu Clearing's."],
  ["Share-weighting", "Rule 605 averages weight by shares, so big orders dominate. The same-trade comparison weights by dollars and matches stock × size."],
  ["Options", "About 70% of payment for order flow comes from options, which Rule 605 doesn't cover at all."],
  ["Citadel", "Citadel Securities blocks automated downloads; its report is added by hand when available."],
  ["Fees change", "Fee facts were read by hand from each broker's own pages on one date and can go stale: brokers change rates and fees without notice. Promotions, sign-up bonuses and paid tiers (Robinhood Gold, Webull Premium and the like) are ignored, so a broker can be cheaper for you than shown. Check its fee page before you decide."],
  ["Calculator", "The yearly cost calculator is an estimate built from averages: a broker's average fill across millions of orders, applied to the trade count and size you type in. Your own fills depend on the stock, the time of day and the order type, so treat it as a guide to how big the differences are, not a bill."],
] as const;

const LINK = "font-semibold text-accent hover:underline";

/** Plain-word answers for first-time visitors. The numbers come from the data so they stay right after a rebuild. */
function questions(d: Data): [string, ReactNode][] {
  // same 100-cell floor as metric(), so a number quoted here is one the explorer also shows
  const gapOf = (id: string) => d.sameStock.brokers.find((g) => g.id === id && g.sp === "Y" && g.cells >= 100)?.gap ?? null;
  const fid = gapOf("FIBS");
  const worst = ([["Wealthfront", gapOf("WLTH")], ["Cash App", gapOf("TPTG")]] as [string, number | null][]).filter(([, v]) => v != null) as [string, number][];
  const pts = (v: number) => `${signed(v, 1)} points`;
  // the payment tests, raw and with share price held equal, so the answer below says what the table says
  const test = (sp: Sp, equal: boolean) => d.evidence.find((e) => e.sp === sp && /^Paid more → customers pay more/.test(e.claim) && /equal share price/.test(e.claim) === equal);
  const rawY = test("Y", false), rawN = test("N", false), eqN = test("N", true);
  const passes = (e: Evidence | undefined) => !!e && e.p < 0.05 && e.rho > 0;
  const stat = (e: Evidence) => `ρ ${e.rho.toFixed(2)}, p ${e.p < 0.001 ? "< 0.001" : e.p.toFixed(2)}`;
  const unmatched = d.brokers.filter((b) => !(d.fees[b.id]?.crd ?? b.crd)).length;
  return [
    ["Is my broker registered?", <>
      <p>Every broker here publishes a Rule 605 execution report, and {unmatched === 0 ? "every one" : unmatched === 1 ? "all but one are" : `all but ${unmatched} are`} matched to a FINRA BrokerCheck record (registration, history, any disciplinary actions). Each broker's page links that record and says whether we found SIPC membership, which protects up to $500,000 of securities and cash per customer if the firm itself fails.</p>
      <p>These are registration facts, not an endorsement: SIPC does not cover losses from the market or from a poor fill, which is what the rest of this site is about. <a href="#/explore" className={LINK}>Pick a broker</a> to see its record.</p>
    </>],
    ["What is payment for order flow?", <>
      <p>When you place a stock order, most brokers don't send it to an exchange. They send it to a trading firm (a market maker such as Citadel Securities or Virtu) that fills it from its own inventory and pays the broker a fraction of a cent per share for the business. Rule 606 makes those payments public every quarter.</p>
      <p>The trading firm earns the gap between the buy and sell quotes (the spread), so the worry is that a broker paid more lets its customers keep less of that gap.
        {rawY && rawN ? (passes(rawN) && !passes(eqN)
          ? <> For S&P 500 stocks the link {passes(rawY) ? "passes the test" : "never passes the test"} ({stat(rawY)}). For other stocks the raw link is {strength(rawN.rho)} and does pass ({stat(rawN)}), but it goes away once the share price of what each broker's customers trade is held equal{eqN ? <> ({stat(eqN)})</> : null}, so share price, not payment, is the likelier driver: who the customers are matters more than who pays.</>
          : <> Across the brokers tracked here the link is {strength(rawY.rho)} for S&P 500 stocks ({stat(rawY)}) and {strength(rawN.rho)} for other stocks ({stat(rawN)}); {eqN && !passes(eqN) ? "with share price held equal it does not pass" : "see the table for the share-price control"}.</>)
          : null}
        {" "}The evidence table above has the tests; <a href="#/explore?m=cost10k&vs=pay10k" className={LINK}>the explorer</a> shows both sides per broker.</p>
    </>],
    ["Does $0 commission mean free?", <>
      <p>No. Almost every broker charges $0 to trade a stock, but your order is filled at a price somewhere between the best buy and the best sell quote, and that gap is a real cost that never appears on a statement. Brokers differ by more on it than on any fee: on the same stocks and order sizes, the best and worst brokers here are tens of points of the spread apart.</p>
      <p><a href="#/" className={LINK}>The home page</a> shows that gap in dollars on a $10,000 trade; <a href="#/calculator" className={LINK}>the calculator</a> adds the fees you do see: options per contract, margin interest and the interest you don't earn on idle cash.</p>
    </>],
    ["Why does Fidelity look best?", <>
      <p>Fidelity's customers paid the smallest share of the spread of any broker here, and the lead holds on identical trades{fid != null ? <>: {pts(fid)} of the spread versus other brokers on the very same S&P 500 stocks and order sizes</> : null}. It also takes little or nothing for routing stock orders.</p>
      <p>But low payment alone doesn't explain it. Wealthfront takes no payment and Cash App actually pays its market maker, and both get among the worst prices on identical trades{worst.length ? <> ({worst.map(([n, v]) => `${n} ${pts(v)}`).join(", ")})</> : null}. The strongest pattern in the data is clientele: brokers whose customers place bigger orders get better prices even within the same order-size bucket, and market makers price each broker's flow separately. The same firms fill Fidelity's and Robinhood's orders at very different prices.</p>
    </>],
    ["Which broker is best?", <>
      <p>It depends on what and how much you trade. The fill ranking covers market orders in stocks. If you trade a few times a year, a dollar or two per trade matters less than the interest on your idle cash or a transfer-out fee; if you mostly trade options, Rule 605 can't see your fills at all.</p>
      <p>Put your own habits into <a href="#/calculator" className={LINK}>the yearly cost calculator</a>, which adds up spread cost, commissions, options fees, idle-cash interest and margin interest per broker, then <a href="#/compare" className={LINK}>compare your two finalists</a> side by side.</p>
    </>],
    ["What can't this site show?", <>
      <ul className="list-disc space-y-1 pl-5">
        <li><b className="font-semibold text-ink">Options.</b> Rule 605 doesn't cover them, although about 70% of payment for order flow comes from options. Only the fee per contract is shown.</li>
        <li><b className="font-semibold text-ink">Limit orders that wait.</b> The fills here are market orders and marketable limit orders (ones that could fill at once). An order resting at your price is not compared.</li>
        <li><b className="font-semibold text-ink">Your own fills.</b> Everything is an average over millions of orders; a single trade of yours can land better or worse.</li>
        <li><b className="font-semibold text-ink">Some brokers.</b> Interactive Brokers, TradeStation, Ally and a few others publish their reports where this pipeline can't reach yet, and brokers that only handle options or crypto file no 605 at all.</li>
      </ul>
    </>],
  ];
}

export default function Method({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp, setSp] = useState<Sp>("Y");
  const ev = d.evidence.filter((e) => e.sp === sp);
  const color = (e: Evidence) => ({ good: t.good, bad: t.critical, neutral: t.muted })[verdict(e)];
  const chart = useMemo(() => forest(t, ev.map((e) => ({
    label: e.claim, rho: e.rho, lo: e.lo, hi: e.hi, color: color(e),
    rows: [[null, "Rank correlation", e.rho.toFixed(2)], [null, "95% interval", `${e.lo.toFixed(2)} to ${e.hi.toFixed(2)}`], [null, "p-value", e.p < 0.001 ? "< 0.001" : e.p.toFixed(3)], [null, "Brokers", String(e.n)], [color(e), "Verdict", VERDICT[verdict(e)]]],
  }))), [t, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  // the unit and the check date are declared once in build_site.py, so the wording follows if either changes
  const unit = d.meta.timeUnit === "ms" ? "milliseconds" : d.meta.timeUnit;
  const checked = d.meta.feesChecked ? dayLong(d.meta.feesChecked, "long") : "a date not recorded";
  const DEFS: [string, string][] = [
    [METRICS.cust.short, "Effective spread ÷ quoted spread, from Rule 605. 0% = filled at the fair price (the midpoint between the best price you could buy at and the best you could sell at), 100% = paid the full quoted spread."],
    [METRICS.cost10k.label, "The same share of the spread × half the broker's typical quoted spread, in dollars per $10,000 of market orders, averaged over all order sizes under $200,000 (so a broker's largest orders weigh most)."],
    [METRICS.payPct.short, "606 payment (¢ per 100 shares, weighted by where orders go) ÷ share price ÷ quoted spread. Checked against Robinhood's own stated 12.35%: this pipeline gets 12.1–13.5%."],
    [METRICS.gap.short, "A broker's cost minus every other broker's, on exactly the same stock × lot size × order size cells, weighted by dollars."],
    ["Rank correlation (ρ)", "Spearman's ρ with average ranks for ties; p-values from 10,000 permutations, intervals from 3,000 bootstrap resamples."],
    [METRICS.speed.label, `Rule 605's weighted average time from when the broker receives a market order to when it is filled, reported in ${unit}. In this data slower fills went with better prices, so speed is shown but never scored: a fast fill is not the same as a good fill.`],
    ["Fees", `From each broker's published fee schedule for a standard self-directed account, read by hand on ${checked}. Cash yield is the yearly interest a broker pays on money left uninvested in your account; a broker that pays none costs you that interest. Paid tiers and promotions are left out, so brokers are compared on what every customer gets.`],
    ["Yearly cost calculator", "Trades a year × typical trade size × the spread cost per dollar from Rule 605 for your mix of S&P 500 and other stocks, plus commissions, plus options fees per contract, plus the interest given up on idle cash compared with the best-paying broker, plus margin interest. A part a broker publishes no fee for is left out of its total and listed as missing."],
  ];
  const faq = useMemo(() => questions(d), [d]);

  return (
    <div className="rise">
      <PageHeader eyebrow="Method" title="How it's measured"
        sub={`Fills from ${monthLong(d.meta.month)} (Rule 605), payments from ${quarterLong(d.meta.quarter)} (Rule 606). Every claim on this site has a test behind it.`} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([icon, title, text], i) => (
          <div key={title} className="relative rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: "var(--grad)" }}><Icon name={icon} size={18} /></span>
              <span className="text-[12px] font-semibold text-muted">Step {i + 1}</span>
            </div>
            <h3 className="mt-3 font-display text-[18px] font-bold text-ink">{title}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink2">{text}</p>
          </div>
        ))}
      </section>

      <Card className="mt-5" title="The evidence" sub="Each dot is a rank correlation across brokers; the line is its 95% bootstrap interval. Crossing zero means it could be chance."
        right={<Segmented size="sm" label="Stocks" value={sp} onChange={setSp} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />}>
        <EChart option={chart} height={ev.length * 62 + 60} label="Forest plot of the evidence" />
        {/* on phones the p and n columns step aside (the tooltip on the dot and the CSV keep them) so claim, ρ and verdict fit without scrolling */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-ink2">
              <th scope="col" className="py-2 pr-3 font-semibold">Claim</th><th scope="col" className="px-3 py-2 text-right font-semibold">ρ</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">p</th><th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">n</th><th scope="col" className="py-2 pl-3 font-semibold">Verdict</th>
            </tr></thead>
            <tbody>{ev.map((e) => (
              <tr key={e.claim} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3 text-ink2">{e.claim}</td>
                <td className="tnum px-3 py-2.5 text-right text-ink">{e.rho.toFixed(2)}</td>
                <td className="tnum hidden px-3 py-2.5 text-right text-ink sm:table-cell">{e.p < 0.001 ? "<0.001" : e.p.toFixed(3)}</td>
                <td className="tnum hidden px-3 py-2.5 text-right text-ink sm:table-cell">{e.n}</td>
                <td className="py-2.5 pl-3"><Status kind={verdict(e)}>{VERDICT[verdict(e)]}</Status></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Key definitions">
          <dl className="space-y-3 text-[13.5px] leading-relaxed">
            {DEFS.map(([k, v]) => (
              <div key={k}><dt className="font-semibold text-ink">{k}</dt><dd className="text-ink2">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <Card title="Caveats">
          <div className="divide-y divide-[var(--border)]">
            {CAVEATS.map(([k, v]) => (
              <details key={k} className="group py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-medium text-ink">
                  {k}<Icon name="right" size={16} className="text-muted transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">{v}</p>
              </details>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Common questions" sub="Short answers in plain words; the evidence above is where they come from.">
        <div className="divide-y divide-[var(--border)]">
          {faq.map(([q, a]) => (
            <details key={q} className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-ink">
                {q}<Icon name="right" size={16} className="text-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-1.5 max-w-3xl space-y-2 text-[13.5px] leading-relaxed text-ink2">{a}</div>
            </details>
          ))}
        </div>
      </Card>

      <Card className="mt-5" title="Related work">
        <p className="text-[13.5px] leading-relaxed text-ink2">
          Schwarz, Barber, Huang, Jorion &amp; Odean (2025), “The ‘Actual Retail Price’ of Equity Trades”, <i>Journal of Finance</i> 80(5).
          Using 85,000 test trades they found payment for order flow did not explain differences in execution. The new mandatory disclosures point the same way.
        </p>
      </Card>
    </div>
  );
}
