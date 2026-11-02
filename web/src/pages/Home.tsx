// The easy layer: plain words, dollars on a $10,000 trade, one broker picker, one chart, a yearly estimate
// and doors to the compare page and the calculator.
import { useMemo, useRef, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { ranked } from "../charts/options";
import Estimator, { loadBroker, saveBroker } from "../components/Estimator";
import { Card, ChartTable, Icon, Segmented, Select } from "../components/ui";
import { brokerRows, nameOf, slugOf, type Data, type Fee, type Metric, type Sp } from "../lib/data";
import { dayLong, dollars, pct, quarterLong, usd2, usdTick } from "../lib/format";
import { go, useBrowserLayoutEffect } from "../lib/hooks";
import { median } from "../lib/stats";
import { METRICS } from "../lib/metrics";
import { brokerPath, comparePath, href, pagePath, pairOrder } from "../lib/routes";
import { useTheme } from "../lib/theme";

const STOCKS: [Sp, string][] = [["Y", "Big companies (S&P 500)"], ["N", "Other stocks"]];
/** the pairs people search for most; each links to its comparison page */
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

/** Section heading with an optional sub line and an optional link on the right; wraps under the title on a phone. */
function Heading({ title, sub, right }: { title: string; sub: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">{title}</h2>
        {sub != null && <p className="mt-1 text-[15px] text-ink2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export default function Home({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp, setSp] = useState<Sp>("Y");
  // the visitor's broker is remembered in the browser; read in an effect, never while rendering (this page also renders on the server)
  const [pick, setPick] = useState("HOOD");
  useBrowserLayoutEffect(() => { setPick(loadBroker()); }, []);
  const card = useRef<HTMLDivElement>(null);
  const choose = (id: string) => { setPick(id); saveBroker(id); };
  // scrolls to the picker and moves focus there too, so the next Tab lands in the section and a screen reader follows
  const toPicker = () => { card.current?.scrollIntoView({ behavior: "smooth", block: "start" }); card.current?.focus({ preventScroll: true }); };
  const base = { ot: "M" as const, b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false };
  /** a popular pair in the order its page shows it, with its link */
  const pairs = PAIRS.filter(([a, b]) => d.byId[a] && d.byId[b]).map(([a, b]) => pairOrder(d.byId[a], d.byId[b]));
  const pairHref = ([x, y]: [{ slug: string }, { slug: string }]) => href(comparePath(x.slug, y.slug));
  const firstPair = pairs[0] ?? pairOrder(d.brokers[0], d.brokers[1] ?? d.brokers[0]);
  const calculatorHref = (id: string) => `${href(pagePath("calculator"))}?b=${slugOf(d, id)}`;

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
    rows: [[t.s[1], METRICS.cost10k.short, usd2(r.cost10k)], [t.s[0], METRICS.pay10k.short, r.pay10k == null ? "no report of its own" : usd2(r.pay10k)]],
  })), { fmt: (v) => usd2(v), axis: usdTick, color: t.s[1], median: med, tone: "low-better" }), [t, rows, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const payLine = !me ? "" : me.pay10k == null ? "Files no payment report of its own (another firm routes its orders)."
    : me.pay10k > 0.005 ? `Paid about ${usd2(me.pay10k)} by trading firms for that order.`
    : me.pay10k < -0.005 ? `Pays its trading firm about ${usd2(-me.pay10k)} for that order.`
    : "Not paid for orders.";
  const gapLine = !me || me.gap == null ? "No same-trade comparison available."
    : me.gap < -3 ? "Better prices than most brokers on identical trades."
    : me.gap > 3 ? "Worse prices than most brokers on identical trades."
    : "About average on identical trades.";
  // fee facts checked by hand on the broker's own pages (fees.csv); each line only shows when the fact is verified
  const fee: Fee | undefined = me ? d.fees[me.id] : undefined;
  const cashLine = fee?.cashYield == null ? null
    : fee.cashYield > 0 ? `${pct(fee.cashYield, 2)} a year on idle cash.` : "No interest on idle cash.";
  const optionsLine = fee?.optionsFee == null ? null
    : fee.optionsFee > 0 ? `${usd2(fee.optionsFee)} per options contract.` : "$0 per options contract.";
  const tone = me && me.cost10k! <= med ? "text-better" : "text-worse";
  /** "pay $0.84 above the fair price" or, for a negative cost, "get $0.10 better than the fair price"; `gloss` explains the term at its first mention */
  const vsFair = (v: number | null | undefined, gloss = false) => {
    const fair = gloss ? <>the fair price (midpoint of the best buy and sell quotes)</> : <>the fair price</>;
    return v != null && v < 0 ? <>get {usd2(-v)} better than {fair}</> : <>pay {usd2(v)} above {fair}</>;
  };
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
  const rawY = test("Y", false), rawN = test("N", false), eqN = test("N", true);
  const paidHurts = !!rawN && rawN.p < 0.05 && rawN.rho > 0 && !(eqN && eqN.p < 0.05);

  return (
    <div className="rise">
      {/* ---------- hero ---------- */}
      <section className="relative pb-12 pt-14 text-center sm:pt-24">
        <div className="glow !inset-y-0 !left-1/2 !right-auto w-screen -translate-x-1/2" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[12.5px] font-medium text-ink2" title={`Data updated ${dayLong(d.meta.built.slice(0, 10))}`}>
            <span className="h-2 w-2 rounded-full bg-[var(--good)]" />Updated weekly
          </div>
          <h1 className="font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[60px]">
            Is your broker getting you a <span className="grad-text">good price?</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17.5px] leading-relaxed text-ink2">
            Trading firms pay brokers for your orders. We read the official reports to show what that costs you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={toPicker} className={`${BTN} text-white shadow-card hover:-translate-y-0.5`} style={{ background: "var(--grad)" }}>
              Check your broker<Icon name="arrow" size={16} className="rotate-90" />
            </button>
            <a href={pairHref(firstPair)} className={`${BTN} border border-line bg-surface text-ink hover:border-accent`}>
              Compare two brokers<Icon name="arrow" size={16} />
            </a>
            <a href={href(pagePath("calculator"))} className={`${BTN} border border-line bg-surface text-ink hover:border-accent`}>
              Yearly cost<Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------- three numbers ---------- */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Stat icon="scale" label="Price gap between brokers" value={hero.length ? usd2(hero[hero.length - 1].cost10k! - hero[0].cost10k!) : "–"}>
          Per $10,000 of S&P 500 market orders, {hero[0]?.f.short} customers {vsFair(hero[0]?.cost10k, true)}; {hero[hero.length - 1]?.f.short} customers {vsFair(hero[hero.length - 1]?.cost10k)}.
        </Stat>
        <Stat icon="coins" label="Paid to brokers for orders" value={dollars(paid)}>
          Paid by trading firms in {quarterLong(lastQ)}.
        </Stat>
        <Stat icon="users" label="Does getting paid hurt you?" value={paidHurts ? "Not by itself" : "Not clearly"}>
          {paidHurts
            ? <>Paid-more brokers do slightly worse outside the S&P 500, but cheap shares explain it, not payment.</>
            : rawY
              ? <>Across {rawY.n} brokers, payment doesn't reliably predict price; your choice of broker matters more.</>
              : <>Payment doesn't reliably predict price; your choice of broker matters more.</>}
        </Stat>
      </section>

      {/* ---------- your broker ---------- */}
      <section ref={card} tabIndex={-1} className="scroll-mt-24 pt-14 outline-none">
        <Heading title="How does your broker do?"
          sub={<>Per $10,000 of market orders, all sizes under $200,000 averaged, so large orders weigh most. For your own trade size, use <a href={calculatorHref(pick)} className="font-semibold text-accent">the calculator</a>.</>}
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
                #{rank} cheapest of {rows.length} brokers
              </div>
              <ul className="mt-6 space-y-3.5 text-[15px] text-ink2">
                <li className="flex gap-3"><Icon name="coins" size={19} className="mt-0.5 text-[var(--s1)]" />{payLine}</li>
                <li className="flex gap-3"><Icon name="scale" size={19} className="mt-0.5 text-accent" />{gapLine}</li>
                {cashLine && <li className="flex gap-3"><Icon name="chart" size={19} className="mt-0.5 text-[var(--s5)]" />{cashLine}</li>}
                {optionsLine && <li className="flex gap-3"><Icon name="layers" size={19} className="mt-0.5 text-[var(--s8)]" />{optionsLine}</li>}
              </ul>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                <a href={href(brokerPath(me.f.slug))} className={LINK}>Full report<Icon name="arrow" size={15} /></a>
                <a href={href(comparePath(me.f.slug, slugOf(d, compareWith(me.id))))} className={LINK}>Compare with…<Icon name="arrow" size={15} /></a>
              </div>
            </Card>

            <Card title="Compared with other brokers">
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
          sub={`${sp === "Y" ? "S&P 500" : "Other"} stocks · tap a bar`}>
          <EChart option={chart} height={rows.length * 27 + 40} label="Extra cost per $10,000 traded at each broker"
            onClick={(p) => { if (p.data?.id) { choose(p.data.id); toPicker(); } }} />
          <ChartTable head={["Broker", METRICS.cost10k.short, METRICS.pay10k.short]}
            rows={rows.map((r) => [r.f.short, usd2(r.cost10k), r.pay10k == null ? "no report of its own" : usd2(r.pay10k)])} />
          <a href={`${href(pagePath("brokers"))}?m=cost10k&vs=pay10k${sp === "N" ? "&sp=N" : ""}`} className={`mt-2 ${LINK}`}>Explore with filters<Icon name="arrow" size={15} /></a>
        </Card>
      </section>

      {/* ---------- a year of trading ---------- */}
      <section className="pt-14">
        <Heading title="What your broker costs you in a year" sub={null}
          right={<a href={calculatorHref(pick)} className={LINK}>Full calculator<Icon name="arrow" size={15} /></a>} />
        <Estimator d={d} compact broker={pick} onBroker={choose} />
      </section>

      {/* ---------- popular comparisons ---------- */}
      <section className="pt-14">
        <Card title="Popular comparisons"
          right={<a href={href(pagePath("compare"))} className={LINK}>Pick any two<Icon name="arrow" size={15} /></a>}>
          <div className="flex flex-wrap gap-2.5">
            {pairs.map((p) => (
              <a key={`${p[0].id}${p[1].id}`} href={pairHref(p)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3.5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-accent hover:bg-[var(--accent-soft)]">
                {p[0].short} <span className="text-muted">vs</span> {p[1].short}
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
            ["coins", "Getting paid doesn't predict the price",
              unpaidPricey.length
                ? <>{topPaid.map((r) => r.f.short).join(" and ")} are paid the most, yet unpaid {unpaidPricey.map((r) => r.f.short).join(" and ")} {unpaidPricey.length > 1 ? "cost" : "costs"} customers more.</>
                : <>{topPaid.map((r) => r.f.short).join(" and ")} are paid the most, but payment only weakly predicts what customers pay.</>,
              `${pagePath("brokers")}?m=cost10k&vs=pay10k`, "See payment vs price"],
            ["scale", "Same stock, very different price",
              <>Same trading firms, yet {gaps[0]?.f.short} customers get the best prices and {gaps[gaps.length - 1]?.f.short} the worst on identical trades.</>,
              `${pagePath("brokers")}?m=gap`, "See every broker"],
            ["layers", "Most of the money is in options",
              <>{optPct}% of the {dollars(paid)} paid in {quarterLong(lastQ)} was for options, which the price reports don't cover.</>,
              pagePath("how-we-measure"), "See how we measure"],
          ].map(([icon, title, text, path, cta]) => (
            <Card key={title as string} className="flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-accent"><Icon name={icon as string} size={20} /></span>
              <h3 className="mt-4 text-[17px] font-semibold text-ink">{title}</h3>
              <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink2">{text}</p>
              <a href={href(path as string)} className={`mt-1.5 ${LINK}`}>{cta}<Icon name="arrow" size={15} /></a>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="pt-14">
        <Card>
          <h2 className="font-display text-[24px] font-extrabold tracking-tight text-ink">How your order gets filled</h2>
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Step n={1} title="You place an order">You tap "buy" in your broker's app.</Step>
            <Step n={2} title="Your broker sends it on">Usually to a trading firm (a "market maker"), which may pay the broker for it.</Step>
            <Step n={3} title="The trading firm fills it">Your price lands between the best buy and sell quotes; every cent a share off the middle (the fair price) is $1 on a $10,000 trade.</Step>
          </div>
          <div className="mt-8 rounded-xl bg-surface2 p-5">
            <div className="grid grid-cols-3 gap-2 text-[12.5px] text-muted"><span>Sell at $99.97</span><span className="text-center font-semibold text-ink">Fair price $100.00</span><span className="text-right">Buy at $100.03</span></div>
            <div className="relative mt-3 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--better), var(--context), var(--worse))" }}>
              <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--surface-2)] bg-ink" />
            </div>
          </div>
        </Card>
      </section>

      {/* ---------- explorer CTA ---------- */}
      <section className="pt-14">
        <div className="relative overflow-hidden rounded-3xl p-8 text-white shadow-card sm:p-12" style={{ background: "var(--grad)" }}>
          <div className="relative max-w-2xl">
            <h2 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[34px]">Want to dig deeper?</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={href(pagePath("brokers"))} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[#1b2a55] hover:bg-white/90">
                Open the explorer<Icon name="arrow" size={16} />
              </a>
              <button type="button" onClick={() => go(pagePath("trading-firms"))} className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-[15px] font-semibold text-white hover:bg-white/20">
                Trading firms
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
