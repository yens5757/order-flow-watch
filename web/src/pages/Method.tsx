import { useMemo, useState } from "react";
import { EChart } from "../charts/EChart";
import { forest } from "../charts/options";
import { Card, Icon, PageHeader, Segmented, Status } from "../components/ui";
import type { Data, Evidence, Sp } from "../lib/data";
import { monthLong, quarterLong } from "../lib/format";
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
  ["Share-weighting", "Rule 605 averages weight by shares, so big orders dominate. The same-stock comparison weights by dollars and matches stock × size."],
  ["Options", "About 70% of payment for order flow comes from options, which Rule 605 doesn't cover at all."],
  ["Citadel", "Citadel Securities blocks automated downloads; its report is added by hand when available."],
] as const;

export default function Method({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp, setSp] = useState<Sp>("Y");
  const ev = d.evidence.filter((e) => e.sp === sp);
  const color = (e: Evidence) => ({ good: t.good, bad: t.critical, neutral: t.muted })[verdict(e)];
  const chart = useMemo(() => forest(t, ev.map((e) => ({
    label: e.claim, rho: e.rho, lo: e.lo, hi: e.hi, color: color(e),
    rows: [[null, "Rank correlation", e.rho.toFixed(2)], [null, "95% interval", `${e.lo.toFixed(2)} to ${e.hi.toFixed(2)}`], [null, "p-value", e.p < 0.001 ? "< 0.001" : e.p.toFixed(3)], [null, "Brokers", String(e.n)], [color(e), "Verdict", VERDICT[verdict(e)]]],
  }))), [t, sp]); // eslint-disable-line react-hooks/exhaustive-deps

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
        right={<Segmented size="sm" value={sp} onChange={setSp} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />}>
        <EChart option={chart} height={ev.length * 62 + 60} label="Forest plot of the evidence" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-ink2">
              <th className="py-2 pr-3 font-semibold">Claim</th><th className="px-3 py-2 text-right font-semibold">ρ</th>
              <th className="px-3 py-2 text-right font-semibold">p</th><th className="px-3 py-2 text-right font-semibold">n</th><th className="py-2 pl-3 font-semibold">Verdict</th>
            </tr></thead>
            <tbody>{ev.map((e) => (
              <tr key={e.claim} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3 text-ink2">{e.claim}</td>
                <td className="tnum px-3 py-2.5 text-right text-ink">{e.rho.toFixed(2)}</td>
                <td className="tnum px-3 py-2.5 text-right text-ink">{e.p < 0.001 ? "<0.001" : e.p.toFixed(3)}</td>
                <td className="tnum px-3 py-2.5 text-right text-ink">{e.n}</td>
                <td className="py-2.5 pl-3"><Status kind={verdict(e)}>{VERDICT[verdict(e)]}</Status></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Key definitions">
          <dl className="space-y-3 text-[13.5px] leading-relaxed">
            {[
              ["Customer pays (% of spread)", "Effective spread ÷ quoted spread, from Rule 605. 0% = filled at the midpoint, 100% = paid the full quoted spread."],
              ["Broker is paid (% of spread)", "606 payment (¢ per 100 shares, weighted by where orders go) ÷ share price ÷ quoted spread. Checked against Robinhood's own stated 12.35%: this pipeline gets 12.1–13.5%."],
              ["Same-stock gap", "A broker's cost minus every other broker's, on exactly the same stock × lot size × order size cells, weighted by dollars."],
              ["Rank correlation (ρ)", "Spearman's ρ with average ranks for ties; p-values from 10,000 permutations, intervals from 3,000 bootstrap resamples."],
            ].map(([k, v]) => (
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

      <Card className="mt-5" title="Related work">
        <p className="text-[13.5px] leading-relaxed text-ink2">
          Schwarz, Barber, Huang, Jorion &amp; Odean (2025), “The ‘Actual Retail Price’ of Equity Trades”, <i>Journal of Finance</i> 80(5).
          Using 85,000 test trades they found payment for order flow did not explain differences in execution. The new mandatory disclosures point the same way.
        </p>
      </Card>
    </div>
  );
}
