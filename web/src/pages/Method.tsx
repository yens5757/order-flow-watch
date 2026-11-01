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
import { median } from "../lib/stats";
import { useTheme } from "../lib/theme";

const verdict = (e: Evidence) => (e.p >= 0.05 ? "neutral" : Math.sign(e.rho) === e.expect ? "good" : "bad") as "good" | "bad" | "neutral";
const VERDICT = { good: "Holds up", bad: "Goes the other way", neutral: "Could be chance" };
/** a p-value as the chance the pattern is random: 0.018 -> "2%", 0.0004 -> "<0.1%" */
const chance = (p: number) => (p < 0.001 ? "<0.1%" : `${(p * 100).toFixed(p < 0.01 ? 1 : 0)}%`);
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
      {fades.length > 0 && <> For {names(fades)}, a link does appear, but it is not statistically significant once the share price of what each broker's customers trade is held equal, so cheaper shares, not payment, are the likelier reason.</>}
      {stays.length > 0 && <> For {names(stays)}, brokers paid more do give worse prices, and the link holds with share price held equal.</>}
      {x.clientele && <> Who a broker's customers are predicts the price you get far better than what the broker is paid.</>}
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
  // brokers paid nothing (or paying) that still get worse prices than most on identical trades
  const unpaid = gaps.filter((r) => r.pay10k != null && r.pay10k <= 0.005 && r.gap! > gapMed).sort((a, b) => b.gap! - a.gap!).slice(0, 2);
  const pts = (v: number) => `${signed(v, 1)} points`;
  const paidHow = (r: Metric) => (r.pay10k! < -0.005 ? "actually pays its trading firm" : "is paid nothing");
  const unmatched = d.brokers.filter((b) => !(d.fees[b.id]?.crd ?? b.crd)).length;

  const items: [string, ReactNode][] = [
    ["Is my broker registered?", <>
      <p>Every broker here publishes the official monthly price report (Rule 605), and {unmatched === 0 ? "every one is" : unmatched === 1 ? "all but one are" : `all but ${unmatched} are`} matched to a FINRA BrokerCheck record (registration, history, any disciplinary actions). Each broker's page links that record and says whether we found SIPC membership, which protects up to $500,000 of securities and cash per customer if the firm itself fails.</p>
      <p>These are registration facts, not an endorsement: SIPC does not cover losses from the market or from a poor price, which is what the rest of this site is about. <a href="#/explore" className={LINK}>Pick a broker</a> to see its record.</p>
    </>],
    ["What is payment for order flow?", <>
      <p>When you place a stock order, most brokers don't send it to an exchange. They send it to a trading firm (a market maker such as Citadel Securities or Virtu) that fills it from its own inventory and pays the broker a fraction of a cent per share for the business. Rule 606 makes those payments public every quarter.</p>
      <p>The trading firm earns the gap between the buy and sell quotes (the spread), so the worry is that a broker paid more lets its customers keep less of that gap. Across the brokers here that link {x.confirmed ? "does show up" : "does not hold up"}: see “Does getting paid make fills worse?” below. The closest published study reached {x.confirmed ? "a different" : "the same"} answer: Schwarz, Barber, Huang, Jorion and Odean (<i>Journal of Finance</i>, 2025) placed 85,000 real trades and found payment for order flow did not explain the price differences. <a href="#/explore?m=cost10k&vs=pay10k" className={LINK}>The explorer</a> shows both sides per broker.</p>
    </>],
    ["Does $0 commission mean free?", <>
      <p>No. Almost every broker charges $0 to trade a stock, but your order is filled at a price somewhere between the best buy and the best sell quote, and that gap is a real cost that never appears on a statement. Brokers differ by more on it than on any fee: on the same stocks and order sizes, the best and worst brokers here are tens of points of the spread apart.</p>
      <p><a href="#/" className={LINK}>The home page</a> shows that gap in dollars on a $10,000 trade; <a href="#/calculator" className={LINK}>the calculator</a> adds the fees you do see: options per contract, margin interest and the interest you don't earn on idle cash.</p>
    </>],
  ];

  if (best) {
    const lead = best.gap == null ? null
      : gaps[0].id === best.id
        ? <>, and the lead holds on identical trades: {pts(best.gap)} of the spread versus other brokers on the very same S&P 500 stocks and order sizes</>
        : <>; on identical S&P 500 stocks and order sizes it is {pts(best.gap)} of the spread versus other brokers ({gaps[0].f.short} leads there, at {pts(gaps[0].gap!)})</>;
    const pay = best.pay10k == null ? null
      : best.pay10k <= 0.005 ? <> It {paidHow(best)} for sending stock orders on.</>
        : best.pay10k < payMed ? <> It is also paid less than most brokers for sending stock orders on.</> : null;
    const why: ReactNode[] = [];
    if (unpaid.length) why.push(<span key="u">But low payment alone doesn't explain it: {andList(unpaid.map((r) => `${r.f.short} ${paidHow(r)}`))}, {unpaid.length > 1 ? "and both get" : "yet it gets"} worse prices than most brokers on identical trades ({unpaid.map((r) => `${r.f.short} ${pts(r.gap!)}`).join(", ")}). </span>);
    if (x.clientele) why.push(<span key="c">The strongest pattern is who the customers are: brokers whose customers place bigger orders get better prices even on orders of the same size{!x.routing && <>, and the same few trading firms that fill most brokers' orders give each broker's orders their own price</>}.</span>);
    items.push([`Why does ${best.f.short} look best?`, <>
      <p>{best.f.short}'s customers paid the least above the fair price of any broker here, per $10,000 of market orders in S&P 500 stocks{lead}.{pay}</p>
      {why.length > 0 && <p>{why}</p>}
    </>]);
  }

  items.push(["Which broker is best?", <>
    <p>It depends on what and how much you trade. The price ranking covers market orders in stocks. If you trade a few times a year, a dollar or two per trade matters less than the interest on your idle cash or a transfer-out fee; if you mostly trade options, the reports don't cover your trades at all.</p>
    <p>Put your own habits into <a href="#/calculator" className={LINK}>the yearly cost calculator</a>, which adds up spread cost, commissions, options fees, idle-cash interest and margin interest per broker, then <a href="#/compare" className={LINK}>compare your two finalists</a> side by side. The calculator is an estimate built from averages, not a bill.</p>
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
    rows: [[null, "Strength", signed(e.rho, 2)], [null, "95% interval", `${signed(e.lo, 2)} to ${signed(e.hi, 2)}`], [null, "Chance it's random", chance(e.p)], [null, "Brokers", String(e.n)], [color(e), "Verdict", VERDICT[verdict(e)]]],
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
    [METRICS.cust.short, "How much of the gap between the buy and sell quotes the customer paid, from the Rule 605 report. 0% = filled at the fair price (the midpoint of the two quotes), 100% = paid the full quoted spread. Lower is better."],
    [METRICS.cost10k.label, "The same share of the spread in dollars per $10,000 of market orders, at the spreads each broker's customers actually faced, averaged over all order sizes under $200,000 (so a broker's largest orders weigh most)."],
    [METRICS.payPct.short, "What trading firms pay the broker per share (from its Rule 606 report, weighted by where its orders go), turned into the same unit as the customer's cost: a share of the quoted spread. As a check, Robinhood's own report says it is paid 12.35% of the spread; our figure is 12.1–13.5%."],
    [METRICS.gap.short, "A broker's cost minus every other broker's on exactly the same stock, order size and lot type (round, odd or fractional), weighted by dollars. Below zero = better than other brokers on identical trades."],
    [METRICS.speed.label, `Rule 605's average time from when the broker receives a market order to when it is filled. The reports do not label the unit; we read it as ${unit} because only that fits the sizes reported.${x.slower ? " In this data slower fills went with better prices, so speed is shown but never scored: a fast fill is not the same as a good price." : " Speed is shown but never scored."}`],
    ["Fees", `From each broker's published fee schedule for a standard self-directed account, checked on ${checked}. Cash yield is the yearly interest a broker pays on money left uninvested in your account. Paid tiers and promotions are left out, so brokers are compared on what every customer gets.`],
  ];

  const cannot: [string, ReactNode][] = [
    ["Options.", <>Rule 605 covers stocks only, though {optShare} what brokers are paid is for options trades; only the fee per contract is shown.</>],
    ["Resting limit orders.", "Only orders that fill at once (market orders and marketable limit orders) are measured; one waiting at your price is a different trade."],
    ["Your own trades.", "Everything is an average over millions of orders; yours can land better or worse, and the yearly cost calculator is an estimate built from those averages, not a bill."],
    ["Taxes, promotions and paid tiers.", "Account types, sign-up bonuses, fee waivers and premium memberships are left out."],
    ["Some payments.", <>
      {no606.length > 0 && <>{andList(no606)} file no payment report of their own (another firm routes their orders). </>}
      {d.byId.SOFI && <>SoFi reports only part of its orders, so its payment is understated. </>}
      {d.byId.FUTM && <>moomoo's payment is reported by its affiliate Futu Clearing.</>}
    </>],
    ["Some brokers.", "TradeStation, Ally and a few others aren't included yet, and brokers that only handle options or crypto publish no price report at all."],
    ["Few brokers, small differences.", <>Only {x.n ?? "a few"} brokers publish both what they are paid and the prices their customers get, so small differences cannot be told from chance. A pattern is not proof of cause.</>],
  ];

  return (
    <div className="rise">
      <PageHeader eyebrow="How we measure" title="How the numbers are measured"
        sub={`Everything here comes from reports brokers must publish by law, read the same way for every broker. Prices: ${month} (Rule 605). Payments: ${quarter} (Rule 606).`} />

      <Card title="Where the numbers come from">
        <div className={BODY}>
          <p>
            <Ext href="https://www.ecfr.gov/current/title-17/section-242.605">Rule 605</Ext> requires larger brokers (100,000 or more accounts) to publish every month how their customers' orders were filled: how far from the fair price, how often better than quoted, and how fast. The trading firms (market makers) that fill the orders file the same report. <Ext href="https://www.ecfr.gov/current/title-17/section-242.606">Rule 606</Ext> requires brokers to publish every quarter which firms they send orders to and what those firms pay for them, known as <Ext href="https://www.investor.gov/introduction-investing/investing-basics/glossary/payment-order-flow">payment for order flow</Ext>. FINRA <Ext href="https://www.finra.org/filing-reporting/regulation-nms/sec-rule-605-reports">lists every Rule 605 report</Ext> and keeps a <Ext href="https://brokercheck.finra.org/">BrokerCheck</Ext> record on each broker.
          </p>
          <p>Trading firms' shares of the market come from FINRA's weekly off-exchange volume data. Fees come from each broker's own pricing pages (see below).</p>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="What “share of the spread” means">
          <div className={BODY}>
            <p>Every stock quotes a buying price and a lower selling price. The gap is the spread; halfway across it is the fair price. Say the quotes are $99.97 to sell and $100.03 to buy: the fair price is $100.00. A buy filled at $100.01 is one cent above fair, a third of the way to the quoted $100.03, so that order paid 33% of the spread. On 100 shares, a $10,000 trade, that cent is $1.</p>
            <p>“{METRICS.cost10k.label}” is the same share in dollars, at the spreads each broker's customers actually faced.</p>
          </div>
        </Card>
        <Card title="Same stocks, same order sizes">
          <div className={BODY}>
            <p>Averages can flatter a broker whose customers buy big, heavily traded stocks in large orders: those get good prices anywhere, and the official averages weight each order by its shares, so a broker's largest orders count most.</p>
            <p>So each broker is also scored against the others on market orders in the same stock, lot type (fractional, odd or round) and order size, weighted by dollars. That is the “{METRICS.gap.short.toLowerCase()}”: below zero means better than other brokers on identical trades.{!x.routing && <> The gaps persist even though the same few trading firms fill most brokers' orders: they price each broker's orders differently.</>}</p>
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Common questions" sub="Short answers in plain words.">
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

      <Card className="mt-5" title="Key definitions" sub="The measures used across the site, in one place.">
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
        <div className="flex flex-col gap-5">
          <Card title="Fees, and when they were checked">
            <div className={BODY}>
              <p>Fees come from each broker's own published schedule for a standard self-directed account: stock commission, options fee per contract, margin interest at about $25,000 borrowed, interest on idle cash and the transfer-out fee. They were last checked on {checked} (each broker's page shows its own date) and are re-checked every quarter.</p>
              <p>A fee that could not be confirmed is left blank and out of every total, never counted as $0; a product not offered says so. Promotions, sign-up bonuses and paid tiers (Robinhood Gold, Webull Premium and the like) are left out, so a broker can be cheaper for you than shown. Fee schedules change without notice: check the broker's own page before you decide.</p>
            </div>
          </Card>
          <Card title="How often the site updates">
            <div className={BODY}>
              <p>The site refreshes every week from the latest filings{updated ? <>; last updated {updated}</> : null}. Price reports are monthly and payment reports quarterly, so the newest payments can be up to a quarter older than the prices. In use now: prices from {month}, payments from {quarter}.</p>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-5" title="Does getting paid make fills worse?" sub="Whether the price you get is worse at brokers that are paid more for your orders.">
        <div className={BODY}>
          {paidAnswer(x)}
          <p>The tests behind this answer are in the card below.</p>
        </div>
      </Card>

      {/* the tests, collapsed: the chart is built only once the card is open, so it never measures a hidden box */}
      <details className="group mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-semibold text-ink">The statistics, for readers who want them</h3>
            <p className="mt-0.5 text-[13px] text-muted">Each dot is how strongly one thing goes with another across brokers, from −1 to 1; a line that crosses zero means it could be chance.</p>
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
                <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Chance it's random</th><th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Brokers</th><th scope="col" className="py-2 pl-3 font-semibold">Verdict</th>
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
            Strength is Spearman's rank correlation (average ranks for ties); “chance it's random” is a permutation p-value from 10,000 shuffles, and the interval a 95% bootstrap from 3,000 resamples. A chance of 5% or more counts as “could be chance”. With {x.n ?? "fewer than 20"} brokers publishing both sides, every test has low power: these are correlations, not causes.
          </p>
        </div>
      </details>
    </div>
  );
}
