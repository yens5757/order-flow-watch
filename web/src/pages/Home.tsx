// The easy layer: plain words, dollars on a $10,000 trade, one broker picker, one chart.
import { useMemo, useRef, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { ranked } from "../charts/options";
import { Card, Icon, Segmented, Select } from "../components/ui";
import { brokerRows, nameOf, type Data, type Metric, type Sp } from "../lib/data";
import { dollars, quarterLong, usd2, usdTick } from "../lib/format";
import { go } from "../lib/hooks";
import { median } from "../lib/stats";
import { useTheme } from "../lib/theme";

const STOCKS: [Sp, string][] = [["Y", "Big companies (S&P 500)"], ["N", "Other stocks"]];

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

export default function Home({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp, setSp] = useState<Sp>("Y");
  const [pick, setPick] = useState(() => { try { return localStorage.getItem("broker") ?? "HOOD"; } catch { return "HOOD"; } });
  const card = useRef<HTMLDivElement>(null);
  const choose = (id: string) => { setPick(id); try { localStorage.setItem("broker", id); } catch { /* fine */ } };
  const base = { ot: "M" as const, b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false };

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
    rows: [[t.s[1], "Extra cost on $10,000", usd2(r.cost10k)], [t.s[0], "Broker is paid", r.pay10k == null ? "not reported" : usd2(r.pay10k)]],
  })), { fmt: (v) => usd2(v), axis: usdTick, color: t.s[1], median: med, tone: "low-better", foot: "Click to see this broker above" }), [t, rows, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const payLine = !me ? "" : me.pay10k == null ? "Doesn't publish what it is paid for customer orders."
    : me.pay10k > 0.005 ? `Gets about ${usd2(me.pay10k)} from trading firms for sending them that order.`
    : me.pay10k < -0.005 ? `Pays its trading firm about ${usd2(-me.pay10k)} to handle that order.`
    : "Isn't paid for sending customer orders.";
  const gapLine = !me || me.gap == null ? "Not enough detail to compare it on identical trades."
    : me.gap < -3 ? "Gets better prices than most brokers on the exact same stocks."
    : me.gap > 3 ? "Gets worse prices than most brokers on the exact same stocks."
    : "About average on the exact same stocks.";
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
            <button type="button" onClick={() => card.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5" style={{ background: "var(--grad)" }}>
              Check your broker<Icon name="arrow" size={16} className="rotate-90" />
            </button>
            <a href="#/explore" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-[15px] font-semibold text-ink hover:border-accent">
              Explore the data<Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------- three numbers ---------- */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Stat icon="scale" label="Price gap between brokers" value={hero.length ? usd2(hero[hero.length - 1].cost10k! - hero[0].cost10k!) : "–"}>
          On the same $10,000 trade, {hero[0]?.f.short} customers {vsFair(hero[0]?.cost10k)}; {hero[hero.length - 1]?.f.short} customers {vsFair(hero[hero.length - 1]?.cost10k)}.
        </Stat>
        <Stat icon="coins" label="Paid to brokers for orders" value={dollars(paid)}>
          Trading firms paid the brokers we track this much in {quarterLong(lastQ)}. {optPct}% of it was for options trades.
        </Stat>
        <Stat icon="users" label="Does getting paid hurt you?" value="Not clearly">
          Brokers that are paid more don't reliably give worse prices. Which broker you use matters more.
        </Stat>
      </section>

      {/* ---------- your broker ---------- */}
      <section ref={card} className="scroll-mt-24 pt-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[28px] font-extrabold tracking-tight text-ink sm:text-[32px]">How does your broker do?</h2>
            <p className="mt-1 text-[15px] text-ink2">Pick a broker. Everything is for a $10,000 market order.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented size="sm" value={sp} onChange={setSp} options={STOCKS} />
            <Select label="Broker" value={me?.id ?? ""} onChange={choose} options={[...rows].sort((a, b) => a.f.short.localeCompare(b.f.short)).map((r) => [r.id, nameOf(r.f)])} />
          </div>
        </div>

        {me && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
            <Card>
              <div className="text-[14px] font-semibold text-ink2">{me.f.name}</div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`font-display text-[54px] font-extrabold leading-none tracking-tight ${tone}`}>{usd2(me.cost10k)}</span>
                <span className="text-[15px] text-ink2">extra on a $10,000 trade</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-3 py-1 text-[13px] font-semibold text-ink">
                #{rank} cheapest of {rows.length} brokers
              </div>
              <ul className="mt-6 space-y-3.5 text-[15px] text-ink2">
                <li className="flex gap-3"><Icon name="coins" size={19} className="mt-0.5 text-[var(--s1)]" />{payLine}</li>
                <li className="flex gap-3"><Icon name="scale" size={19} className="mt-0.5 text-accent" />{gapLine}</li>
                <li className="flex gap-3"><Icon name="info" size={19} className="mt-0.5 text-muted" />"Fair price" = halfway between the best buy and sell quotes when you traded.</li>
              </ul>
              <a href={`#/broker/${me.id}`} className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:gap-2.5 transition-all">
                Full report for {me.f.short}<Icon name="arrow" size={15} />
              </a>
            </Card>

            <Card title="Compared with other brokers" sub="Extra paid on a $10,000 trade">
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

        <Card className="mt-5" title="What a $10,000 trade costs at each broker"
          sub={`Extra paid above the fair price · ${sp === "Y" ? "big-company (S&P 500)" : "other"} stocks · tap a bar to check that broker`}>
          <EChart option={chart} height={rows.length * 27 + 40} label="Cost of a $10,000 trade at each broker"
            onClick={(p) => { if (p.data?.id) { choose(p.data.id); card.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } }} />
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
              <a href={`#/${href}`} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent hover:gap-2.5 transition-all">{cta}<Icon name="arrow" size={15} /></a>
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
            <Step n={3} title="The trading firm fills it">You get a price somewhere between the best buy and sell quotes. The closer to the middle, the better for you.</Step>
          </div>
          <div className="mt-8 rounded-xl bg-surface2 p-5">
            <div className="flex justify-between text-[12.5px] text-muted"><span>Best sell quote $99.97</span><span className="font-semibold text-ink">Fair price $100.00</span><span>Best buy quote $100.03</span></div>
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
              Pick what to measure, filter by stock type, order size and quarter, compare any two measures and sort every broker. The charts update as you go.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#/explore" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-semibold text-[#1b2a55] hover:bg-white/90">
                Open the explorer<Icon name="arrow" size={16} />
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
