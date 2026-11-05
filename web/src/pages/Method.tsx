// The "How we measure" page: where the numbers come from, what they mean and what they cannot show, in plain words.
// Every number and name quoted here is read from site.json, so the wording stays right after a rebuild. The statistical
// tests sit in one collapsed card at the bottom; Home.tsx looks the same evidence rows up by their claim text.
import { useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { forest } from "../charts/options";
import { Card, Icon, PageHeader, Segmented, Status } from "../components/ui";
import { brokerRows, files606, type Data, type Evidence, type Metric, type Sp } from "../lib/data";
import { dayLong, monthLong, quarterLong, signed } from "../lib/format";
import { METRICS } from "../lib/metrics";
import { href, pagePath } from "../lib/routes";
import { median } from "../lib/stats";
import { useTheme } from "../lib/theme";
import { payment } from "../lib/broker";

const verdict = (e: Evidence) => (e.p >= 0.05 ? "neutral" : Math.sign(e.rho) === e.expect ? "good" : "bad") as "good" | "bad" | "neutral";
const VERDICT = { good: "Holds up", bad: "Goes the other way", neutral: "Could be chance" };
/** a p-value as the chance the pattern is random: 0.018 -> "2%", 0.0004 -> "<0.1%" */
const chance = (p: number) => (p < 0.001 ? "<0.001" : p.toFixed(p < 0.01 ? 3 : 2));
/** "A, B and C" */
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const LINK = "font-semibold text-accent hover:underline";
const BODY = "max-w-3xl space-y-2 text-[14px] leading-relaxed text-ink2";
const Ext = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} target="_blank" rel="noopener" className={LINK}>{children}</a>;

/** The payment tests from the evidence table, raw and with share price held equal, plus the clientele, speed and routing
 *  rows, so every sentence about them on this page says what the table says. */
function tests(d: Data) {
  const test = (sp: Sp, equal: boolean) => d.evidence.find((e) => e.sp === sp && /^Paid more → customers pay more/.test(e.claim) && /equal share price/.test(e.claim) === equal);
  const passes = (e: Evidence | undefined) => !!e && e.p < 0.05 && e.rho > 0;
  const holds = (re: RegExp) => d.evidence.some((e) => re.test(e.claim) && e.p < 0.05 && Math.sign(e.rho) === e.expect);
  const groups = ([["Y", "S&P 500 stocks"], ["N", "other stocks"]] as [Sp, string][]).map(([sp, name]) => ({ name, raw: passes(test(sp, false)), equal: passes(test(sp, true)) }));
  return {
    groups,
    /** a payment link that survives holding share price equal, for either group */
    confirmed: groups.some((g) => g.raw && g.equal),
    clientele: holds(/^Bigger typical order/),
    slower: holds(/^Slower fills/),
    routing: holds(/^Routing mix/),
    /** brokers that publish both a payment and a price */
    n: test("Y", false)?.n ?? test("N", false)?.n ?? null,
  };
}
type Tests = ReturnType<typeof tests>;

/** "Does getting paid make fills worse?", written from the test results so it can never contradict the table. */
function paidAnswer(x: Tests): ReactNode {
  const names = (gs: Tests["groups"]) => andList(gs.map((g) => g.name));
  const none = x.groups.filter((g) => !g.raw), fades = x.groups.filter((g) => g.raw && !g.equal), stays = x.groups.filter((g) => g.raw && g.equal);
  return (
    <p>
      <b className="font-semibold text-ink">{stays.length === x.groups.length ? "Yes, in this data." : x.confirmed ? "Partly." : "Not in any way the data can confirm."}</b>
      {none.length > 0 && <> For {names(none)}, brokers paid more do not reliably give worse prices.</>}
      {fades.length > 0 && <> For {names(fades)}, a link appears but fades once share price is held equal: cheaper shares, not payment, are the likelier reason.</>}
      {stays.length > 0 && <> For {names(stays)}, brokers paid more do give worse prices, even at equal share price.</>}
      {x.clientele && <> Who the customers are predicts the price far better than payment.</>}
    </p>
  );
}

/** Plain-word answers for first-time visitors. Names and numbers come from the data so they stay right after a rebuild. */
function questions(d: Data, x: Tests): [string, ReactNode][] {
  // the home page's ranking: market orders in S&P 500 stocks, all sizes under $200,000
  const rows = brokerRows(d, { sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false })
    .filter((r) => r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!);
  const best: Metric | undefined = rows[0];
  const gaps = rows.filter((r) => r.gap != null).sort((a, b) => a.gap! - b.gap!);
  const gapMed = median(gaps.map((r) => r.gap!)) ?? 0;
  const payMed = median(rows.filter((r) => r.pay10k != null && r.pay10k > 0.005).map((r) => r.pay10k!)) ?? 0;
  // brokers paid nothing (or paying) that still get worse prices than most on the same stocks and sizes
  const unpaid = gaps.filter((r) => r.pay10k != null && r.pay10k <= 0.005 && r.gap! > gapMed).sort((a, b) => b.gap! - a.gap!).slice(0, 2);
  const pts = (v: number) => `${signed(v, 1)} points`;
  // "pays its trading firm" only when a trading firm's rate is below zero (lib/broker.ts payment); exchange fees aren't that
  const paidHow = (r: Metric) => (payment(d, r, "Y").kind === "pays" ? "actually pays its trading firm" : "is paid nothing");
  const unmatched = d.brokers.filter((b) => !(d.fees[b.id]?.crd ?? b.crd)).length;

  const items: [string, ReactNode][] = [
    ["Is my broker registered?", <>
      <p>Every broker here publishes the Rule 605 price report and {unmatched === 0 ? "every one is" : unmatched === 1 ? "all but one are" : `all but ${unmatched} are`} matched to a FINRA BrokerCheck record; each broker's page links it and says whether we found SIPC membership (up to $500,000 of securities and cash if the firm fails).</p>
      <p>Registration is not an endorsement: SIPC does not cover a poor price. <a href={href(pagePath("brokers"))} className={LINK}>Pick a broker</a> to see its record.</p>
    </>],
    ["What is payment for order flow?", <>
      <p>Most brokers send your stock order to a trading firm that fills it and pays the broker a fraction of a cent per share; Rule 606 makes those payments public.</p>
      <p>The worry is that a broker paid more lets you keep less of the spread. Here that link {x.confirmed ? "does show up" : "does not hold up"} (see below); Schwarz, Barber, Huang, Jorion and Odean (<i>Journal of Finance</i>, 2025) reached {x.confirmed ? "a different" : "the same"} answer from 85,000 real trades. <a href={`${href(pagePath("brokers"))}?m=cost10k&vs=pay10k`} className={LINK}>The explorer</a> shows both sides.</p>
    </>],
    ["Does $0 commission mean free?", <>
      <p>No: your order fills somewhere between the best buy and sell quote, and that gap is a real cost that never shows on a statement. Brokers differ by more on it than on any fee.</p>
      <p><a href={href(pagePath("home"))} className={LINK}>The home page</a> shows it in dollars; <a href={href(pagePath("calculator"))} className={LINK}>the calculator</a> adds the fees you do see.</p>
    </>],
  ];

  if (best) {
    const lead = best.gap == null ? null
      : gaps[0].id === best.id
        ? <>, and it holds on the same stocks and order sizes ({pts(best.gap)} vs other brokers)</>
        : <>; on the same stocks and order sizes it is {pts(best.gap)} ({gaps[0].f.short} leads there at {pts(gaps[0].gap!)})</>;
    const pay = best.pay10k == null ? null
      : best.pay10k <= 0.005 ? <> It {paidHow(best)} for orders.</>
        : best.pay10k < payMed ? <> It is also paid less than most brokers.</> : null;
    const why: ReactNode[] = [];
    if (unpaid.length) why.push(<span key="u">Low payment alone doesn't explain it: {andList(unpaid.map((r) => `${r.f.short} ${paidHow(r)}`))}, {unpaid.length > 1 ? "and both get" : "yet it gets"} worse prices than most on the same stocks and order sizes ({unpaid.map((r) => `${r.f.short} ${pts(r.gap!)}`).join(", ")}). </span>);
    if (x.clientele) why.push(<span key="c">The strongest pattern is clientele: brokers whose customers place bigger orders get better prices even at the same order size{!x.routing && <>, and the same trading firms appear to price each broker's orders differently</>}.</span>);
    items.push([`Why does ${best.f.short} look best?`, <>
      <p>{best.f.short}'s customers paid the least above the fair price per $10,000 of S&P 500 market orders{lead}.{pay}</p>
      {why.length > 0 && <p>{why}</p>}
    </>]);
  }

  items.push(["Which broker is best?", <>
    <p>It depends on what and how much you trade: with a few trades a year, idle-cash interest or a transfer-out fee matters more than a dollar per trade, and options aren't in the price reports at all.</p>
    <p>Put your habits into <a href={href(pagePath("calculator"))} className={LINK}>the calculator</a>, then <a href={href(pagePath("compare"))} className={LINK}>compare your two finalists</a>. It's an estimate from averages, not a bill.</p>
  </>]);
  return items;
}

export default function Method({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp, setSp] = useState<Sp>("Y");
  const [open, setOpen] = useState(false);
  const ev = d.evidence.filter((e) => e.sp === sp);
  const color = (e: Evidence) => ({ good: t.good, bad: t.critical, neutral: t.muted })[verdict(e)];
  const chart = useMemo(() => forest(t, ev.map((e) => ({
    label: e.claim, rho: e.rho, lo: e.lo, hi: e.hi, color: color(e),
    rows: [[null, "Strength", signed(e.rho, 2)], [null, "95% interval", `${signed(e.lo, 2)} to ${signed(e.hi, 2)}`], [null, "p-value (shuffle test)", chance(e.p)], [null, "Brokers", String(e.n)], [color(e), "Verdict", VERDICT[verdict(e)]]],
  }))), [t, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const x = useMemo(() => tests(d), [d]);
  const faq = useMemo(() => questions(d, x), [d, x]);

  // the unit and the check date are declared once in build_site.py, so the wording follows if either changes
  const unit = d.meta.timeUnit === "ms" ? "milliseconds" : d.meta.timeUnit;
  const checked = d.meta.feesChecked ? dayLong(d.meta.feesChecked, "long") : "a date not recorded";
  const updated = /^\d{4}-\d{2}-\d{2}/.test(d.meta.built) ? dayLong(d.meta.built.slice(0, 10), "long") : null;
  const month = monthLong(d.meta.month), quarter = quarterLong(d.meta.quarter);

  // what the data leaves out, with the names and shares read from it
  const no606 = d.brokers.filter((b) => !files606(d, b.crd)).map((b) => b.short);
  const lastQ = d.meta.quarters[d.meta.quarters.length - 1];
  const paid = d.usd.filter((u) => u.q === lastQ).reduce((a, u) => a + Math.max(0, u.usd), 0);
  const options = d.usd.filter((u) => u.q === lastQ && u.seg === "Options").reduce((a, u) => a + Math.max(0, u.usd), 0);
  const optShare = paid > 0 ? `about ${Math.round((100 * options) / paid)}% of` : "most of";

  const DEFS: [string, string][] = [
    [METRICS.payPct.short, "What trading firms pay the broker (Rule 606, weighted by where its orders go), as a share of the quoted spread. Check: Robinhood's own report says 12.35% of the spread in regular hours (9% after hours); our estimate is 12–15%, depending on which month's spreads it is divided by. Customer pays uses the SEC's effective/quoted ratio, which counts the distance from the midpoint twice, so the two percentages are on different scales: compare them in dollars per $10,000."],
    [METRICS.speed.label, `Rule 605's average time from order to fill, in ${unit} (the unit the SEC's report specification sets). Shown, never scored${x.slower ? ": here slower fills went with better prices" : ""}.`],
  ];

  const cannot: [string, ReactNode][] = [
    ["Options, limit orders, your own trades.", <>Rule 605 covers stocks only (though {optShare} what brokers are paid is for options) and only orders that fill at once; everything is an average, so your own trade can land better or worse; taxes, promotions and paid tiers are left out.</>],
    ["Some payments.", <>
      {no606.length > 0 && <>{andList(no606)} file no payment report of their own (another firm routes their orders). </>}
      {d.byId.SOFI && <>SoFi reports only part of its orders. </>}
      {d.byId.FUTM && <>moomoo's is reported by Futu Clearing. </>}
      {(d.meta.payFallback ?? []).length > 0 && <>{andList((d.meta.payFallback ?? []).map((id) => d.byId[id]?.short ?? id))} {(d.meta.payFallback ?? []).length > 1 ? "haven't" : "hasn't"} reported {quarterLong(d.meta.quarter)} yet, so the quarter before is used.</>}
    </>],
    ["Few brokers.", <>Only {x.n ?? "a few"} brokers publish both sides (TradeStation, Ally and others aren't in yet), so small differences can't be told from chance; a pattern is not proof of cause.</>],
  ];

  return (
    <div className="rise">
      <PageHeader title="How the numbers are measured"
        intro={`From the reports brokers must publish, refreshed weekly${updated ? `; last updated ${updated}` : ""}. Prices: ${month} (Rule 605). Payments: ${quarter} (Rule 606).`} />

      <Card title="Where the numbers come from">
        <div className={BODY}>
          <p>
            <Ext href="https://www.ecfr.gov/current/title-17/section-242.605">Rule 605</Ext>: brokers with 100,000+ accounts publish monthly how their customers' orders were filled; the trading firms that fill them file the same report. <Ext href="https://www.ecfr.gov/current/title-17/section-242.606">Rule 606</Ext>: brokers publish quarterly where orders go and what they are paid (<Ext href="https://www.investor.gov/introduction-investing/investing-basics/glossary/payment-order-flow">payment for order flow</Ext>). FINRA <Ext href="https://www.finra.org/filing-reporting/regulation-nms/sec-rule-605-reports">lists every 605 report</Ext> and holds each broker's <Ext href="https://brokercheck.finra.org/">BrokerCheck</Ext> record.
          </p>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="What “share of the spread” means">
          <div className={BODY}>
            <p>The gap between the best buy and sell quotes is the spread; halfway across it is the fair price. With quotes of $99.97 and $100.03, fair is $100.00; a buy at $100.01 is a cent above fair, a third of the way to $100.03, so it paid 33% of the spread ($1 on 100 shares).</p>
            <p>“{METRICS.cost10k.label}” is that share in dollars, at the spreads each broker's customers faced.</p>
          </div>
        </Card>
        <Card title="Same stocks, same order sizes">
          <div className={BODY}>
            <p>Averages flatter brokers whose customers trade big, liquid stocks in large orders.</p>
            <p>So each broker is also scored against the others on market orders in the same stock, lot type and order size: the “{METRICS.gap.short.toLowerCase()}”, below zero = better than other brokers on the same stocks and order sizes.{!x.routing && <> The gaps persist with the same trading firms filling the orders, which suggests they price each broker's flow differently.</>}</p>
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Common questions">
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

      <Card className="mt-5" title="Key definitions">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13.5px] leading-relaxed sm:grid-cols-2">
          {DEFS.map(([k, v]) => (
            <div key={k}><dt className="font-semibold text-ink">{k}</dt><dd className="text-ink2">{v}</dd></div>
          ))}
        </dl>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="What the data cannot show">
          <ul className="list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink2">
            {cannot.map(([k, v]) => <li key={k}><b className="font-semibold text-ink">{k}</b> {v}</li>)}
          </ul>
        </Card>
        <Card title="Fees, and when they were checked">
          <div className={BODY}>
            <p>Each broker's published schedule for a standard self-directed account, last checked {checked}; re-checked every quarter.</p>
            <p>An unconfirmed fee is left blank and out of every total, never counted as $0; promotions and paid tiers are left out, so a broker can be cheaper for you than shown.</p>
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Does getting paid make fills worse?">
        <div className={BODY}>
          {paidAnswer(x)}
        </div>
      </Card>

      {/* the tests, collapsed: the chart is built only once the card is open, so it never measures a hidden box */}
      <details className="group mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-semibold text-ink">The statistics</h3>
            <p className="mt-0.5 text-[13px] text-muted">Strength from −1 to 1; a line crossing zero could be chance.</p>
          </div>
          <Icon name="right" size={18} className="mt-1 text-muted transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-4">
          <div className="mb-3 flex justify-end">
            <Segmented size="sm" label="Stocks" value={sp} onChange={setSp} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />
          </div>
          {open && <EChart option={chart} height={ev.length * 62 + 60} label="Forest plot of the evidence" />}
          {/* on phones the chance and broker columns step aside (the tooltip on the dot keeps them) so claim, strength and verdict fit without scrolling */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead><tr className="border-b border-line text-left text-ink2">
                <th scope="col" className="py-2 pr-3 font-semibold">Claim</th><th scope="col" className="px-3 py-2 text-right font-semibold">Strength (−1 to 1)</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">p-value</th><th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Brokers</th><th scope="col" className="py-2 pl-3 font-semibold">Verdict</th>
              </tr></thead>
              <tbody>{ev.map((e) => (
                <tr key={e.claim} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 text-ink2">{e.claim}</td>
                  <td className="tnum px-3 py-2.5 text-right text-ink">{signed(e.rho, 2)}</td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink sm:table-cell">{chance(e.p)}</td>
                  <td className="tnum hidden px-3 py-2.5 text-right text-ink sm:table-cell">{e.n}</td>
                  <td className="py-2.5 pl-3"><Status kind={verdict(e)}>{VERDICT[verdict(e)]}</Status></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            Spearman rank correlation; permutation p-value (10,000 shuffles); 95% bootstrap interval (3,000 resamples); 5% or more = “could be chance”. With {x.n ?? "fewer than 20"} brokers, every test has low power: correlations, not causes.
          </p>
        </div>
      </details>
    </div>
  );
}
