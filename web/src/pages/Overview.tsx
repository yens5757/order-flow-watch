import { useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { divergingBars, labeledScatter, lines, stackedBars } from "../charts/options";
import { Card, Icon, Info, Kpi, Segmented } from "../components/ui";
import { brokerRows, type Data, type Sp } from "../lib/data";
import { dollars, monthLong, pct, quarterLong, quarterShort, signed, strength } from "../lib/format";
import { go } from "../lib/hooks";
import { useTheme } from "../lib/theme";

const SP_OPTS: [Sp, string][] = [["Y", "S&P 500"], ["N", "Other stocks"]];

function Finding({ n, title, takeaway, right, children, link }: {
  n: number; title: string; takeaway: ReactNode; right?: ReactNode; children: ReactNode; link?: [string, string];
}) {
  return (
    <Card className="flex flex-col"
      title={<span className="flex items-center gap-2.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-soft)] text-[12px] font-bold text-accent">{n}</span>{title}</span>}
      sub={takeaway} right={right}>
      <div className="flex-1">{children}</div>
      {link && (
        <a href={`#/${link[0]}`} className="mt-3 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-accent hover:gap-2.5 transition-all">
          {link[1]}<Icon name="arrow" size={15} />
        </a>
      )}
    </Card>
  );
}

export default function Overview({ d }: { d: Data }) {
  const { t } = useTheme();
  const [sp1, setSp1] = useState<Sp>("Y");
  const [sp2, setSp2] = useState<Sp>("Y");
  const [sp3, setSp3] = useState<Sp>("Y");
  const base = { ot: "M" as const, b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false };
  const short = (id: string) => d.byId[id]?.short ?? id;
  const ev = (sp: Sp, start: string) => d.evidence.find((e) => e.sp === sp && e.claim.startsWith(start));

  // 1 · paid vs customer cost
  const rows1 = useMemo(() => brokerRows(d, { ...base, sp: sp1 }).filter((r) => r.payPct != null), [d, sp1]); // eslint-disable-line react-hooks/exhaustive-deps
  const ev1 = ev(sp1, "Paid more → customers pay more");
  const scatter = useMemo(() => labeledScatter(t, rows1.map((r) => ({
    id: r.id, name: r.f.short, x: r.payPct!, y: r.cust!,
    rows: [[t.s[0], "Broker is paid", pct(r.payPct, 1)], [t.s[1], "Customer pays", pct(r.cust, 1)], [null, "Extra cost on a $10k trade", dollars(r.cost10k)]],
  })), { xName: "Broker is paid (% of the spread)", yName: "Customer pays (% of the spread)", xFmt: (v) => `${v}%`, yFmt: (v) => `${v}%`, clickable: true }), [t, rows1]);

  // 2 · same stocks, different prices
  const gaps = d.sameStock.brokers.filter((g) => g.sp === sp2 && g.cells >= 100).sort((a, b) => a.gap - b.gap);
  const gapChart = useMemo(() => divergingBars(t, gaps.map((g) => ({
    id: g.id, name: short(g.id), v: g.gap,
    rows: [[null, "This broker's customers pay", pct(g.own, 1)], [null, "Other brokers, same trades", pct(g.peers, 1)], [null, "Identical stock × size cells", g.cells.toLocaleString()]],
  })), { clickable: true, unit: " pts" }), [t, gaps]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3 · where the customer's cost goes
  const money = d.money.filter((m) => m.sp === sp3 && m.pay != null && m.mmKeeps != null && m.mmKeeps >= 0 && m.mmKeeps <= m.cust + 5)
    .map((m) => {
      const toBroker = Math.max(0, m.pay!), toMM = Math.max(0, m.mmKeeps! - toBroker), moved = Math.max(0, m.cust - m.mmKeeps!);
      return { id: m.id, name: short(m.id), parts: [toBroker, toMM, moved], total: m.cust };
    }).sort((a, b) => b.total - a.total);
  const moneyChart = useMemo(() => stackedBars(t, money, [
    { name: "Paid to the broker", color: t.s[0] }, { name: "Kept by the market maker", color: t.s[2] }, { name: "Lost to price moves", color: t.context },
  ], { fmt: (v) => `${v.toFixed(0)}%`, foot: "Shares of the quoted spread. Market maker's take = its realized spread 1 minute after the trade." }), [t, money]); // eslint-disable-line react-hooks/exhaustive-deps
  const hood = money.find((m) => m.id === "HOOD");
  const hoodShare = hood ? (100 * hood.parts[0]) / (hood.parts[0] + hood.parts[1]) : null;

  // 4 · dollars paid, by segment
  const qs = d.meta.quarters;
  const seg = (s: string) => qs.map((q) => d.usd.filter((u) => u.q === q && u.seg === s).reduce((a, u) => a + Math.max(0, u.usd), 0));
  const opt = seg("Options"), spx = seg("SP500"), oth = seg("OtherStocks");
  const last = qs.length - 1, totLast = opt[last] + spx[last] + oth[last], totFirst = opt[0] + spx[0] + oth[0];
  const dollarsChart = useMemo(() => lines(t, qs.map(quarterShort), [
    { name: "S&P 500 stocks", values: spx, color: t.s[0] }, { name: "Other stocks", values: oth, color: t.s[1] }, { name: "Options", values: opt, color: t.s[2] },
  ], { fmt: (v) => dollars(v), area: true, stack: true, total: true }), [t, d]); // eslint-disable-line react-hooks/exhaustive-deps

  // headline numbers
  const ladder = d.sameStock.brokers.filter((g) => g.sp === "Y" && g.cells >= 100).sort((a, b) => a.gap - b.gap);
  const best = ladder[0], worst = ladder[ladder.length - 1];
  const maxAbs = Math.max(1, ...ladder.map((g) => Math.abs(g.gap)));
  const tall = Math.max(380, gaps.length * 22 + 40); // findings 1 and 2 share a row, so they share a height
  const evY = ev("Y", "Paid more → customers pay more");
  const paidCount = brokerRows(d, { ...base, sp: "Y" }).filter((r) => r.payPct != null).length;
  const top2 = brokerRows(d, { ...base, sp: "Y" }).filter((r) => r.payPct != null).sort((a, b) => b.payPct! - a.payPct!).slice(0, 2);

  return (
    <div className="rise">
      {/* ---------- hero ---------- */}
      <section className="relative grid items-center gap-10 pb-10 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="glow !inset-y-0 !left-1/2 !right-auto w-screen -translate-x-1/2" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[12.5px] font-medium text-ink2">
            <span className="h-2 w-2 rounded-full bg-[var(--good)]" />SEC Rule 605 &amp; 606 · refreshed every week
          </div>
          <h1 className="font-display text-[38px] font-extrabold leading-[1.06] tracking-tight text-ink sm:text-[54px]">
            Do brokers that get paid for your orders give you <span className="grad-text">worse prices?</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink2">
            <b className="text-ink">Not reliably.</b> {top2.map((r) => r.f.short).join(" and ")} are paid the most and give below-average
            prices, but some brokers paid nothing do worse. Which broker you use matters more than whether it's paid.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#/brokers" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14.5px] font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5" style={{ background: "var(--grad)" }}>
              Compare brokers<Icon name="arrow" size={16} />
            </a>
            <a href="#/method" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-[14.5px] font-semibold text-ink hover:border-accent">
              How it's measured
            </a>
          </div>
        </div>

        {/* best and worst brokers on identical trades */}
        <div className="relative rounded-2xl border border-line bg-surface/80 p-5 shadow-card backdrop-blur">
          <div className="text-[13px] font-semibold text-ink">Same trade, different price</div>
          <div className="mt-0.5 text-[12px] text-muted">S&amp;P 500 market orders vs other brokers on identical trades</div>
          {([["Best", ladder.slice(0, 3)], ["Worst", ladder.slice(-3).reverse()]] as const).map(([label, gs]) => (
            <div key={label} className="mt-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
              {gs.map((g) => (
                <a key={g.id} href={`#/broker/${g.id}`} className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-surface2">
                  <span className="w-24 truncate text-[13.5px] font-medium text-ink">{short(g.id)}</span>
                  <span className="relative h-2 flex-1 rounded-full bg-surface2">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(100 * Math.abs(g.gap)) / maxAbs}%`, background: g.gap < 0 ? "var(--better)" : "var(--worse)" }} />
                  </span>
                  <span className={`tnum w-14 text-right text-[13px] font-semibold ${g.gap < 0 ? "text-better" : "text-worse"}`}>{signed(g.gap, 1)}</span>
                </a>
              ))}
            </div>
          ))}
          <div className="mt-3 text-[11.5px] text-muted">Points of the spread · click a broker for details</div>
        </div>
      </section>

      {/* ---------- headline numbers ---------- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon="users" label="Brokers compared" value={d.brokers.length} sub={`${paidCount} also report what they're paid · fills from ${monthLong(d.meta.month)}`} />
        <Kpi icon="scale" label="Payment ↔ worse prices" value={evY ? `ρ ${evY.rho.toFixed(2)}` : "–"}
          sub={evY ? `${strength(evY.rho)} link, not statistically significant (p = ${evY.p.toFixed(2)})` : undefined} />
        <Kpi icon="chart" label="Same trade, different price" value={best && worst ? `${(worst.gap - best.gap).toFixed(0)} pts` : "–"}
          sub={best && worst ? `${short(best.id)} ${signed(best.gap, 0)} vs ${short(worst.id)} ${signed(worst.gap, 0)} points of the spread` : undefined} />
        <Kpi icon="coins" label={`Paid to brokers, ${quarterShort(qs[last])}`} value={dollars(totLast)}
          sub={`${Math.round((100 * opt[last]) / totLast)}% from options · ${(totLast / totFirst).toFixed(1)}× ${quarterShort(qs[0])}`} />
      </section>

      {/* ---------- findings ---------- */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-[26px] font-extrabold tracking-tight text-ink">Four findings</h2>
          <span className="hidden text-[12.5px] text-muted sm:inline">Hover any chart for details · click a broker to open its profile</span>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Finding n={1} title="Getting paid barely predicts worse prices"
            takeaway={ev1 ? `Rank correlation ${ev1.rho.toFixed(2)} (${strength(ev1.rho)}), p = ${ev1.p.toFixed(2)}: not significant.` : ""}
            right={<Segmented size="sm" value={sp1} onChange={setSp1} options={SP_OPTS} />} link={["brokers", "Compare every broker"]}>
            <EChart option={scatter} height={tall} label="Scatter of broker payment against customer cost" onClick={(p) => p.data?.id && go(`broker/${p.data.id}`)} />
          </Finding>

          <Finding n={2} title="Same stocks, very different prices"
            takeaway="Each broker vs everyone else on identical stock × order-size trades. Left is better."
            right={<Segmented size="sm" value={sp2} onChange={setSp2} options={SP_OPTS} />} link={["brokers", "See the full ranking"]}>
            <EChart option={gapChart} height={tall} label="Same-stock price gap per broker"
              onClick={(p) => p.data?.id && go(`broker/${p.data.id}`)} />
          </Finding>

          <Finding n={3} title="Market makers keep most of the spread"
            takeaway={hoodShare != null ? `Even Robinhood, the best-paid broker, gets only ~${hoodShare.toFixed(0)}% of what its market makers make.` : "What the customer pays, split by who ends up with it."}
            right={<Segmented size="sm" value={sp3} onChange={setSp3} options={SP_OPTS} />} link={["market-makers", "Look at the market makers"]}>
            <EChart option={moneyChart} height={Math.max(340, money.length * 26 + 70)} label="Split of the customer's cost per broker"
              onClick={(p) => p.data?.id && go(`broker/${p.data.id}`)} />
          </Finding>

          <Finding n={4} title="The real money is in options"
            takeaway={`${Math.round((100 * opt[last]) / totLast)}% of payments in ${quarterLong(qs[last])} came from options trades, which execution reports don't cover.`}
            link={["method", "What the data can't show"]}>
            <EChart option={dollarsChart} height={Math.max(340, money.length * 26 + 70)} label="Payments to tracked brokers per quarter, by segment" />
          </Finding>
        </div>
      </section>

      {/* ---------- primer ---------- */}
      <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card title="The spread" info="Every stock has a bid (best price to sell) and an ask (best price to buy). The gap is the spread; halfway is the midpoint, the fairest price.">
          <div className="mt-1 rounded-xl bg-surface2 p-4">
            <div className="flex justify-between text-[12px] text-muted"><span>Bid $99.97</span><span>Mid $100.00</span><span>Ask $100.03</span></div>
            <div className="relative mt-2 h-2 rounded-full" style={{ background: "linear-gradient(90deg, var(--s1), var(--context), var(--s2))" }}>
              <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-ink" />
            </div>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">We measure cost as the <b className="text-ink">share of the spread</b> a customer pays: 0% means filled at the midpoint.</p>
        </Card>
        <Card title="Payment for order flow" info="Market makers such as Citadel Securities pay brokers to receive their customers' orders, then profit from filling them.">
          <p className="text-[13.5px] leading-relaxed text-ink2">Brokers like Robinhood route your order to a <b className="text-ink">market maker</b>, who pays the broker for it. Critics say that payment comes out of your price.</p>
        </Card>
        <Card title="Where the numbers come from">
          <ul className="space-y-2 text-[13.5px] text-ink2">
            <li className="flex gap-2"><Icon name="database" size={16} className="mt-0.5 text-accent" /><span><b className="text-ink">Rule 605</b>: monthly fill quality, now required from big brokers too (Aug 2026)</span></li>
            <li className="flex gap-2"><Icon name="coins" size={16} className="mt-0.5 text-accent" /><span><b className="text-ink">Rule 606</b>: quarterly routing and payments, per broker</span></li>
            <li className="flex gap-2"><Icon name="clock" size={16} className="mt-0.5 text-accent" /><span>Pulled and re-analysed automatically every Monday</span></li>
          </ul>
          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-muted">Caveats <Info>About a dozen brokers report both payment and fills, so these are correlations, not causes. Fills are monthly; payments quarterly.</Info></span>
        </Card>
      </section>
    </div>
  );
}
