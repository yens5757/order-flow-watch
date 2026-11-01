// The easy layer: plain words, dollars on a $10,000 trade, one broker picker, one chart, a yearly estimate
// and doors to the compare page and the calculator.
import { useMemo, useRef, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { ranked } from "../charts/options";
import Estimator from "../components/Estimator";
import { Card, ChartTable, Icon, Segmented, Select } from "../components/ui";
import { brokerRows, nameOf, type Data, type Fee, type Metric, type Sp } from "../lib/data";
import { dollars, pct, quarterLong, usd2, usdTick } from "../lib/format";
import { go } from "../lib/hooks";
import { median } from "../lib/stats";
import { METRICS } from "../lib/metrics";
import { useTheme } from "../lib/theme";

const STOCKS: [Sp, string][] = [["Y", "Big companies (S&P 500)"], ["N", "Other stocks"]];
/** the pairs people search for most; each links to #/compare/<A>/<B> */
const PAIRS: [string, string][] = [["HOOD", "FIBS"], ["HOOD", "CHAS"], ["HOOD", "WBUS"], ["WBUS", "FUTM"], ["CHAS", "FIBS"], ["FIBS", "VGRD"]];
/** the broker a pick is compared with by default (Fidelity, or Robinhood when Fidelity is the pick) */
const compareWith = (id: string) => (id === "FIBS" ? "HOOD" : "FIBS");

const BTN = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold transition-transform max-sm:w-full";
const LINK = "-my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[14px] font-semibold text-accent hover:gap-2.5 transition-all"; // 40px tall to tap, laid out as one line

function Stat({ icon, value, label, children }: { icon: string; value: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent-soft)] text-accent"><Icon name={icon} size={16} /></span>{label}
      </div>
      <div className="mt-4 font-display text-[40px] font-extrabold leading-none tracking-tight text-ink">{value}</div>
      <p className="mt-3 text-[14px] leading-relaxed text-ink2">{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="relative">
      <span className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold text-white" style={{ background: "var(--grad)" }}>{n}</span>
      <h3 className="mt-3 text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-ink2">{children}</p>
    </div>
  );
}

/** Section heading with an optional link on the right; wraps under the title on a phone. */
function Heading({ title, sub, right }: { title: string; sub: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">{title}</h2>
        <p className="mt-1 text-[15px] text-ink2">{sub}</p>
      </div>
      {right}
    </div>
  );
}

export default function Home({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp, setSp] = useState<Sp>("Y");
  const [pick, setPick] = useState(() => { try { return localStorage.getItem("broker") ?? "HOOD"; } catch { return "HOOD"; } });
  const card = useRef<HTMLDivElement>(null);
  const choose = (id: string) => { setPick(id); try { localStorage.setItem("broker", id); } catch { /* fine */ } };
  // scrolls to the picker and moves focus there too, so the next Tab lands in the section and a screen reader follows
  const toPicker = () => { card.current?.scrollIntoView({ behavior: "smooth", block: "start" }); card.current?.focus({ preventScroll: true }); };
  const base = { ot: "M" as const, b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false };
  const short = (id: string) => d.byId[id]?.short ?? id;

  // headline numbers always use big-company stocks, the most common trade
  const hero = useMemo(() => brokerRows(d, { ...base, sp: "Y" }).filter((r) => r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const qs = d.meta.quarters, lastQ = qs[qs.length - 1];
  const paid = d.usd.filter((u) => u.q === lastQ).reduce((a, u) => a + Math.max(0, u.usd), 0);
  const options = d.usd.filter((u) => u.q === lastQ && u.seg === "Options").reduce((a, u) => a + Math.max(0, u.usd), 0);
  const optPct = Math.round((100 * options) / paid);

  // the picker and the chart follow the stock toggle
  const rows = useMemo(() => brokerRows(d, { ...base, sp }).filter((r) => r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!), [d, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const me: Metric | undefined = rows.find((r) => r.id === pick) ?? rows[0];
  const rank = me ? rows.indexOf(me) + 1 : null;
  const med = median(rows.map((r) => r.cost10k!)) ?? 0;
  const cheapest = rows[0], priciest = rows[rows.length - 1];
  const chart = useMemo(() => ranked(t, rows.map((r) => ({
    id: r.id, name: r.f.short, v: r.cost10k!, hl: r.id === me?.id,
    rows: [[t.s[1], METRICS.cost10k.short, usd2(r.cost10k)], [t.s[0], METRICS.pay10k.short, r.pay10k == null ? "not reported" : usd2(r.pay10k)]],
  })), { fmt: (v) => usd2(v), axis: usdTick, color: t.s[1], median: med, tone: "low-better", foot: "Click to see this broker above" }), [t, rows, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const payLine = !me ? "" : me.pay10k == null ? "Doesn't publish what it is paid for customer orders."
    : me.pay10k > 0.005 ? `Gets about ${usd2(me.pay10k)} from trading firms for sending them that order.`
    : me.pay10k < -0.005 ? `Pays its trading firm about ${usd2(-me.pay10k)} to handle that order.`
    : "Isn't paid for sending customer orders.";
  const gapLine = !me || me.gap == null ? "Not enough detail to compare it on identical trades."
    : me.gap < -3 ? "Gets better prices than most brokers on the exact same stocks."
    : me.gap > 3 ? "Gets worse prices than most brokers on the exact same stocks."
    : "About average on the exact same stocks.";
  // fee facts checked by hand on the broker's own pages (fees.csv); each line only shows when the fact is verified
  const fee: Fee | undefined = me ? d.fees[me.id] : undefined;
  const cashLine = fee?.cashYield == null ? null
    : fee.cashYield > 0 ? `Pays ${pct(fee.cashYield, 2)} a year on cash you leave uninvested.` : "Pays no interest on cash you leave uninvested.";
  const optionsLine = fee?.optionsFee == null ? null
    : fee.optionsFee > 0 ? `Charges ${usd2(fee.optionsFee)} per options contract.` : "Charges nothing per options contract.";
  const tone = me && me.cost10k! <= med ? "text-better" : "text-worse";
  /** "pay $0.84 above the fair price" or, for a negative cost, "get $0.10 better than the fair price" */
  const vsFair = (v: number | null | undefined) => (v != null && v < 0 ? <>get {usd2(-v)} better than the fair price</> : <>pay {usd2(v)} above the fair price</>);
  const scale = Math.max(0.01, ...rows.map((r) => r.cost10k!));
  const compare = me ? [
    ["Cheapest", cheapest], ["Typical broker", null], [me.f.short, me], ["Priciest", priciest],
  ] as [string, Metric | null][] : [];

  // findings in plain words
  const topPaid = [...hero].filter((r) => r.pay10k != null).sort((a, b) => b.pay10k! - a.pay10k!).slice(0, 2);
  const paidMax = Math.max(...topPaid.map((r) => r.cost10k!));
  const unpaidPricey = hero.filter((r) => r.pay10k != null && r.pay10k <= 0.005 && r.cost10k! > paidMax).slice(-2).reverse();
  const gaps = hero.filter((r) => r.gap != null).sort((a, b) => a.gap! - b.gap!);
  // the payment test for other stocks passes on its own (ρ 0.50, p 0.04) but not once share price is held equal: the stat says both
  const test = (sp: Sp, equal: boolean) => d.evidence.find((e) => e.sp === sp && /^Paid more → customers pay more/.test(e.claim) && /equal share price/.test(e.claim) === equal);
  const rawN = test("N", false), eqN = test("N", true);
  const paidHurts = !!rawN && rawN.p < 0.05 && rawN.rho > 0 && !(eqN && eqN.p < 0.05);

  return (
    <div className="rise">
      {/* ---------- hero ---------- */}
      <section className="relative pb-12 pt-14 text-center sm:pt-24">
        <div className="glow !inset-y-0 !left-1/2 !right-auto w-screen -translate-x-1/2" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[12.5px] font-medium text-ink2">
            <span className="h-2 w-2 rounded-full bg-[var(--good)]" />Updated every week from official SEC filings
          </div>
          <h1 className="font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[60px]">
            Is your broker getting you a <span className="grad-text">good price?</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17.5px] leading-relaxed text-ink2">
            When you buy a stock, your broker usually sends the order to a trading firm, and that firm often pays the broker for it.
            We read the reports brokers must publish by law to show what that means for you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={toPicker} className={`${BTN} text-white shadow-card hover:-translate-y-0.5`} style={{ background: "var(--grad)" }}>
              Check your broker<Icon name="arrow" size={16} className="rotate-90" />
            </button>
            <a href={`#/compare/${PAIRS[0][0]}/${PAIRS[0][1]}`} className={`${BTN} border border-line bg-surface text-ink hover:border-accent`}>
              Compare two brokers<Icon name="arrow" size={16} />
            </a>
            <a href="#/calculator" className={`${BTN} border border-line bg-surface text-ink hover:border-accent`}>
              What does it cost you a year?<Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------- three numbers ---------- */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Stat icon="scale" label="Price gap between brokers" value={hero.length ? usd2(hero[hero.length - 1].cost10k! - hero[0].cost10k!) : "–"}>
          For every $10,000 of market orders, {hero[0]?.f.short} customers {vsFair(hero[0]?.cost10k)}; {hero[hero.length - 1]?.f.short} customers {vsFair(hero[hero.length - 1]?.cost10k)}.
        </Stat>
        <Stat icon="coins" label="Paid to brokers for orders" value={dollars(paid)}>
          Trading firms paid the brokers we track this much in {quarterLong(lastQ)}. {optPct}% of it was for options trades.
        </Stat>
        <Stat icon="users" label="Does getting paid hurt you?" value={paidHurts ? "Not by itself" : "Not clearly"}>
          {paidHurts
            ? <>Paid-more brokers do give worse fills in smaller stocks, but the gap vanishes once the share price of what their customers trade is held equal. Which broker you use matters more.</>
            : <>Brokers that are paid more don't reliably give worse prices. Which broker you use matters more.</>}
        </Stat>
      </section>

      {/* ---------- your broker ---------- */}
      <section ref={card} tabIndex={-1} className="scroll-mt-24 pt-14 outline-none">
        <Heading title="How does your broker do?" sub="Pick a broker. Everything is per $10,000 of market orders, averaged over all order sizes under $200,000."
          right={
            <div className="flex flex-wrap items-center gap-3">
              <Segmented size="sm" label="Stocks" value={sp} onChange={setSp} options={STOCKS} />
              <Select label="Broker" value={me?.id ?? ""} onChange={choose} options={[...rows].sort((a, b) => a.f.short.localeCompare(b.f.short)).map((r) => [r.id, nameOf(r.f)])} />
            </div>
          } />

        {me && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
            <Card>
              <div className="text-[14px] font-semibold text-ink2">{me.f.name}</div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`font-display text-[54px] font-extrabold leading-none tracking-tight ${tone}`}>{usd2(me.cost10k)}</span>
                <span className="text-[15px] text-ink2">extra per $10,000 traded</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-3 py-1 text-[13px] font-semibold text-ink">
                #{rank} cheapest of {rows.length} brokers per $10,000 traded
              </div>
              <ul className="mt-6 space-y-3.5 text-[15px] text-ink2">
                <li className="flex gap-3"><Icon name="coins" size={19} className="mt-0.5 text-[var(--s1)]" />{payLine}</li>
                <li className="flex gap-3"><Icon name="scale" size={19} className="mt-0.5 text-accent" />{gapLine}</li>
                {cashLine && <li className="flex gap-3"><Icon name="chart" size={19} className="mt-0.5 text-[var(--s5)]" />{cashLine}</li>}
                {optionsLine && <li className="flex gap-3"><Icon name="layers" size={19} className="mt-0.5 text-[var(--s8)]" />{optionsLine}</li>}
                <li className="flex gap-3"><Icon name="info" size={19} className="mt-0.5 text-muted" />"Fair price" = halfway between the best price you could buy at and the best you could sell at when you traded (the midpoint).</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                <a href={`#/broker/${me.id}`} className={LINK}>Full report for {me.f.short}<Icon name="arrow" size={15} /></a>
                <a href={`#/compare/${me.id}/${compareWith(me.id)}`} className={LINK}>Compare {me.f.short} with…<Icon name="arrow" size={15} /></a>
              </div>
            </Card>

            <Card title="Compared with other brokers" sub={METRICS.cost10k.label}>
              <div className="space-y-5 pt-1">
                {compare.map(([label, r]) => {
                  const v = r ? r.cost10k! : med, mine = r?.id === me.id;
                  return (
                    <div key={label}>
                      <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
                        <span className={mine ? "font-bold text-ink" : "text-ink2"}>{label}{r && !mine ? <span className="text-muted"> · {r.f.short}</span> : null}</span>
                        <span className={`tnum font-semibold ${mine ? "text-ink" : "text-ink2"}`}>{usd2(v)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-surface2">
                        <div className="h-3 rounded-full transition-all duration-500" style={{
                          width: `${Math.max(1.5, (100 * Math.max(0, v)) / scale)}%`,
                          background: mine ? "var(--grad)" : v <= med ? "var(--better)" : "var(--worse)", opacity: mine ? 1 : 0.75,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        <Card className="mt-5" title="What each broker costs per $10,000 traded"
          sub={`Extra paid above the fair price · ${sp === "Y" ? "big-company (S&P 500)" : "other"} stocks · market orders of every size · tap a bar to check that broker`}>
          <EChart option={chart} height={rows.length * 27 + 40} label="Extra cost per $10,000 traded at each broker"
            onClick={(p) => { if (p.data?.id) { choose(p.data.id); toPicker(); } }} />
          <ChartTable head={["Broker", METRICS.cost10k.short, METRICS.pay10k.short]}
            rows={rows.map((r) => [r.f.short, usd2(r.cost10k), r.pay10k == null ? "not reported" : usd2(r.pay10k)])} />
          <a href={`#/explore?m=cost10k&vs=pay10k${sp === "N" ? "&sp=N" : ""}`} className={`mt-2 ${LINK}`}>Explore these numbers with filters<Icon name="arrow" size={15} /></a>
        </Card>
      </section>

      {/* ---------- a year of trading ---------- */}
      <section className="pt-14">
        <Heading title="What your broker costs you in a year" sub="A few cents a trade adds up. Type in how often and how much you trade to see the yearly total at each broker."
          right={<a href={`#/calculator?b=${pick}`} className={LINK}>Open the full calculator<Icon name="arrow" size={15} /></a>} />
        <Estimator d={d} compact broker={pick} onBroker={choose} />
      </section>

      {/* ---------- popular comparisons ---------- */}
      <section className="pt-14">
        <Card title="Popular comparisons" sub="Two brokers side by side: fills, fees and what you'd pay"
          right={<a href="#/compare" className={LINK}>Pick any two<Icon name="arrow" size={15} /></a>}>
          <div className="flex flex-wrap gap-2.5">
            {PAIRS.map(([a, b]) => (
              <a key={`${a}${b}`} href={`#/compare/${a}/${b}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3.5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-accent hover:bg-[var(--accent-soft)]">
                {short(a)} <span className="text-muted">vs</span> {short(b)}
              </a>
            ))}
          </div>
        </Card>
      </section>

      {/* ---------- findings ---------- */}
      <section className="pt-14">
        <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">What we found</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            ["coins", "Getting paid isn't the main problem",
              unpaidPricey.length
                ? <>{topPaid.map((r) => r.f.short).join(" and ")} are paid the most for orders, yet {unpaidPricey.map((r) => r.f.short).join(" and ")}, which {unpaidPricey.length > 1 ? "aren't" : "isn't"} paid at all, {unpaidPricey.length > 1 ? "cost" : "costs"} customers more.</>
                : <>{topPaid.map((r) => r.f.short).join(" and ")} are paid the most for orders, but how much a broker is paid only weakly predicts what its customers pay.</>,
              "explore?m=cost10k&vs=pay10k", "See payment vs price"],
            ["scale", "Same stock, very different price",
              <>Comparing the exact same trades, {gaps[0]?.f.short} customers get the best prices and {gaps[gaps.length - 1]?.f.short} customers the worst, even when the same trading firms fill them.</>,
              "explore?m=gap", "See every broker"],
            ["layers", "Most of the money is in options",
              <>{optPct}% of the {dollars(paid)} paid to brokers in {quarterLong(lastQ)} was for options trades, which these price reports don't cover at all.</>,
              "method", "What the data can't show"],
          ].map(([icon, title, text, href, cta]) => (
            <Card key={title as string} className="flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-accent"><Icon name={icon as string} size={20} /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-ink">{title}</h3>
              <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink2">{text}</p>
              <a href={`#/${href}`} className={`mt-1.5 ${LINK}`}>{cta}<Icon name="arrow" size={15} /></a>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="pt-14">
        <Card>
          <h2 className="font-display text-[24px] font-extrabold tracking-tight text-ink">How your order gets filled</h2>
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Step n={1} title="You place an order">You tap "buy" for a few shares of a stock in your broker's app.</Step>
            <Step n={2} title="Your broker sends it on">Most brokers pass it to a trading firm (a "market maker"), which may pay the broker for the business.</Step>
            <Step n={3} title="The trading firm fills it">You get a price somewhere between the best price you could buy at and the best you could sell at. The closer to the middle (the fair price), the better for you.</Step>
          </div>
          <div className="mt-8 rounded-xl bg-surface2 p-5">
            <div className="grid grid-cols-3 gap-2 text-[12.5px] text-muted"><span>You could sell at $99.97</span><span className="text-center font-semibold text-ink">Fair price $100.00</span><span className="text-right">You could buy at $100.03</span></div>
            <div className="relative mt-3 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--better), var(--context), var(--worse))" }}>
              <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--surface-2)] bg-ink" />
            </div>
            <p className="mt-3 text-[13.5px] text-ink2">Buying at $100.01 instead of $100.00 costs a cent a share: $1 on a $10,000 trade of 100 shares. Small per trade, big across millions of trades.</p>
          </div>
        </Card>
      </section>

      {/* ---------- explorer CTA ---------- */}
      <section className="pt-14">
        <div className="relative overflow-hidden rounded-3xl p-8 text-white shadow-card sm:p-12" style={{ background: "var(--grad)" }}>
          <div className="relative max-w-2xl">
            <h2 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[34px]">Want to dig deeper?</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-white/85">
              Put two brokers side by side, work out what a year of your own trading costs at each one, or open the explorer:
              pick what to measure, filter by stock type, order size and quarter, and sort every broker. The charts update as you go.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#/explore" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[#1b2a55] hover:bg-white/90">
                Open the explorer<Icon name="arrow" size={16} />
              </a>
              <a href={`#/compare/${PAIRS[0][0]}/${PAIRS[0][1]}`} className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/20">
                Compare two brokers
              </a>
              <a href="#/calculator" className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/20">
                Yearly cost calculator
              </a>
              <button type="button" onClick={() => go("market-makers")} className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/20">
                Meet the trading firms
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
