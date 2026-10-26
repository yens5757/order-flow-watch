import type { ReactNode } from "react";
import { Badge, Card } from "../components/ui";
import type { Data, Evidence } from "../lib/data";
import { monthLong, quarterLong, signed } from "../lib/format";

function verdict(e: Evidence): [string, "good" | "bad" | "neutral"] {
  if (e.p >= 0.05) return ["Not significant", "neutral"];
  return Math.sign(e.rho) === e.expect ? ["Supported", "good"] : ["Contradicted", "bad"];
}

function H({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-6 text-[15px] font-semibold text-ink first:mt-0">{children}</h3>;
}

export default function Method({ d }: { d: Data }) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-8">
      <div><h1 className="text-[28px] font-semibold tracking-tight text-ink">Method, evidence &amp; caveats</h1>
        <p className="mt-1 text-[14.5px] text-ink2">How every number on this site is made, and how much weight each finding can bear.</p></div>

      <Card title="The evidence, claim by claim" sub="Spearman rank correlation across brokers · two-sided permutation p-value · 95% bootstrap interval">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-[12px] text-ink2">
              <th className="py-2 pr-3 font-semibold">Claim</th><th className="px-3 font-semibold">Stocks</th>
              <th className="px-3 text-right font-semibold">Correlation</th><th className="px-3 text-right font-semibold">Likely range</th>
              <th className="px-3 text-right font-semibold">p</th><th className="px-3 text-right font-semibold">Brokers</th><th className="pl-3 font-semibold">Verdict</th></tr></thead>
            <tbody>
              {d.evidence.map((e) => {
                const [v, tone] = verdict(e);
                return (
                  <tr key={e.claim + e.sp} className="border-b border-grid last:border-0">
                    <td className="min-w-[220px] py-2.5 pr-3 text-ink">{e.claim}</td><td className="whitespace-nowrap px-3 text-ink2">{e.sp === "Y" ? "S&P 500" : "Other"}</td>
                    <td className="tnum px-3 text-right">{signed(e.rho, 2)}</td><td className="tnum whitespace-nowrap px-3 text-right text-ink2">{signed(e.lo, 2)} to {signed(e.hi, 2)}</td>
                    <td className="tnum px-3 text-right">{e.p < 0.001 ? "<0.001" : e.p.toFixed(3)}</td><td className="tnum px-3 text-right">{e.n}</td>
                    <td className="whitespace-nowrap pl-3"><Badge tone={tone}>{v}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">With about a dozen brokers, a correlation needs to be around ±0.55 to reach p &lt; 0.05. "Not significant" means the data can't tell the effect apart from chance yet, not that there is no effect.</p>
      </Card>

      <Card>
        <div className="space-y-2 text-[14.5px] leading-relaxed text-ink2 [&_b]:font-semibold [&_b]:text-ink">
          <H>The two core numbers</H>
          <p><b>Customer pays</b> = effective spread ÷ quoted spread (Rule 605 "AvgEFQPct"). 100% = the customer paid the full quoted spread; 0% = filled at the midpoint; below 0% = better than the midpoint.</p>
          <p><b>Broker is paid</b> = net payment from venues (Rule 606, cents per 100 shares), weighted by each venue's share of the broker's orders and averaged over the quarter,
            then divided by the broker's average share price and quoted spread. Check: Robinhood's own 606 says it is paid 12.35% of the spread; this method gives 12.1–13.5%.</p>
          <H>Comparing on the same stocks</H>
          <p>The detailed Rule 605 files give results per stock, lot size (fractional, odd, round) and order size. For each such cell, a broker is compared with the dollar-weighted average of the
            <b> other</b> brokers in the same cell; its score is the average gap, weighted by its own dollars. Only plain market orders under $200k, and cells with at least three other brokers, are used.
            The <b>routing prediction</b> multiplies a broker's share of orders sent to each market maker by that market maker's own same-stock score.</p>
          <H>Updates</H>
          <p>An automated job runs <b>every week</b>: it downloads any new Rule 605 reports (monthly, published about a month after the month ends) and Rule 606 reports (quarterly, about a month after
            the quarter), rebuilds the database and republishes this site. Current data: fills from <b>{monthLong(d.meta.month)}</b>, payments from <b>{quarterLong(d.meta.quarter)}</b>; built {d.meta.built}.</p>
          <H>Caveats</H>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><b>Small sample.</b> About a dozen brokers report both payments and fills; results are correlations, not causes.</li>
            <li><b>Timing.</b> Monthly fills are compared with the latest quarterly payments, which can be a quarter older.</li>
            <li><b>Share-weighting.</b> Rule 605 averages weight by shares, so a broker's "all orders" figure leans on its largest orders. The same-stock method avoids this.</li>
            <li><b>Wealthfront</b> sends almost no market orders (its orders are limit orders), so it is left out of market-order comparisons where its sample is tiny.</li>
            <li><b>Missing payments.</b> Albert, Avenue, eToro, Stash and Wells Fargo Advisors Financial Network file no 606 of their own. SoFi reports only its share; its clearing firm keeps the rest.</li>
            <li><b>Citadel</b> blocks automated downloads, so its reports are added by hand; months without it compare five market makers, not six.</li>
            <li><b>Options</b> make up most payment dollars, but Rule 605 covers only stocks.</li>
          </ul>
          <H>Sources</H>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>SEC Rule 605 reports: public.s3.com/rule605, plus Citadel, Jane Street and Virtu's own websites; firm names from FINRA's Rule 605 directory.</li>
            <li>SEC Rule 606 reports: FINRA bulk files (cdn.finra.org/606reportBulk), 2024 Q2 onwards.</li>
            <li>FINRA OTC transparency data (weekly volume per firm); S&amp;P 500 membership (Wikipedia); Nasdaq Trader symbol directory; VIX (FRED).</li>
            <li>Related research: Schwarz, Barber, Huang, Jorion &amp; Odean, "The 'Actual Retail Price' of Equity Trades", <i>Journal of Finance</i> (2025).</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
