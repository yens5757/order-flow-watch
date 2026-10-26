import { useMemo, useState, type ReactNode } from "react";
import { GapBars, MoneyBars, RankBars, RankDots } from "../charts/bars";
import { FlowDiagram, SpreadDiagram } from "../charts/special";
import { Columns, Meter, Scatter } from "../charts/xy";
import { Kicker, Legend, Segmented } from "../components/ui";
import { TipRow, TipTitle } from "../components/Tooltip";
import { brokerRows, type Data, type Sp } from "../lib/data";
import { dollars, monthLong, pct, quarterLong, quarterShort, signed, strength } from "../lib/format";
import { go } from "../lib/hooks";
import { spearman } from "../lib/stats";

function Step({ n, kicker, title, children }: { n?: number; kicker?: string; title: string; children: ReactNode }) {
  return (
    <section className="pt-16 sm:pt-20">
      <Kicker>{n ? `Step ${n} of 4` : kicker}</Kicker>
      <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">{title}</h2>
      <div className="mt-4 space-y-4 text-[16.5px] leading-relaxed text-ink2 [&_b]:font-semibold [&_b]:text-ink">{children}</div>
    </section>
  );
}

function Figure({ title, sub, toggle, caption, children }: { title: string; sub?: string; toggle?: ReactNode; caption?: ReactNode; children: ReactNode }) {
  return (
    <figure className="my-7 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-ink">{title}</div>
          {sub && <div className="text-[13px] text-muted">{sub}</div>}
        </div>
        {toggle}
      </div>
      {children}
      {caption && <figcaption className="mt-3 text-[13px] leading-relaxed text-muted">{caption}</figcaption>}
    </figure>
  );
}

export default function Story({ d }: { d: Data }) {
  const [sp, setSp] = useState<Sp>("Y");
  const f = { sp, ot: "M" as const, b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false };
  const rows = useMemo(() => brokerRows(d, f), [d, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const spRows = useMemo(() => brokerRows(d, { ...f, sp: "Y" }), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const paid = rows.filter((r) => r.payPct != null);
  const rhoOf = (rs: typeof rows) => { const p = rs.filter((r) => r.payPct != null); return spearman(p.map((r) => r.payPct!), p.map((r) => r.cust!)); };
  const rhoY = rhoOf(spRows), rhoN = rhoOf(brokerRows(d, { ...f, sp: "N" })), rho = rhoOf(rows);
  const top2 = [...spRows.filter((r) => r.payPct != null)].sort((a, b) => b.payPct! - a.payPct!).slice(0, 2);
  const cheap = spRows.filter((r) => r.cost10k != null).map((r) => r.cost10k!);
  const toggle = <Segmented size="sm" value={sp} onChange={setSp} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />;
  const short = (id: string) => d.byId[id]?.short ?? id;

  // Same stocks: gap vs peers + what the broker's market makers alone would predict
  const implied = new Map(d.implied.filter((r) => r.sp === sp).map((r) => [r.id, r.implied]));
  const gaps = d.sameStock.brokers.filter((g) => g.sp === sp && g.cells >= 100).sort((a, b) => a.gap - b.gap);
  const evRouting = d.evidence.find((e) => e.sp === sp && e.claim.startsWith("Routing"));
  const evClientele = d.evidence.find((e) => e.sp === sp && e.claim.startsWith("Bigger"));
  const evPaySame = d.evidence.find((e) => e.sp === sp && e.claim.startsWith("Paid more → worse prices on the same"));
  const sameMM = (a: string, b: string) => {
    const ca = d.byId[a]?.crd, cb = d.byId[b]?.crd;
    const vs = (c?: string | null) => new Set(d.venues.filter((v) => v.crd === c && v.q === d.meta.quarter && v.sp === sp && (v.share.M ?? 0) >= 5).map((v) => v.venue));
    const A = vs(ca), B = vs(cb);
    return [...A].filter((v) => B.has(v));
  };
  const shared = sameMM("HOOD", "CHAS");
  const gapOf = (id: string) => gaps.find((g) => g.id === id)?.gap;

  // Follow the money (market maker's 1-minute realized spread vs what it pays the broker)
  const money = d.money.filter((m) => m.sp === sp && m.pay != null && m.mmKeeps != null && m.mmKeeps >= 0 && m.mmKeeps <= m.cust + 5)
    .map((m) => ({ ...m, toBroker: Math.max(0, m.pay!), toMM: Math.max(0, m.mmKeeps! - Math.max(0, m.pay!)), moved: Math.max(0, m.cust - m.mmKeeps!) }))
    .sort((a, b) => b.cust - a.cust);
  const share = (id: string) => { const m = money.find((x) => x.id === id); return m && m.mmKeeps! > 0 ? (100 * m.toBroker) / m.mmKeeps! : null; };

  // Options: tracked brokers' payments by segment per quarter
  const qs = d.meta.quarters;
  const seg = (s: string) => qs.map((q) => d.usd.filter((u) => u.q === q && u.seg === s).reduce((a, u) => a + Math.max(0, u.usd), 0));
  const opt = seg("Options"), spx = seg("SP500"), oth = seg("OtherStocks");
  const last = qs.length - 1, totLast = opt[last] + spx[last] + oth[last], totFirst = opt[0] + spx[0] + oth[0];

  return (
    <div className="mx-auto max-w-[50rem] px-4 pb-24">
      {/* ---------- hero ---------- */}
      <header className="pt-12 sm:pt-16">
        <Kicker>Payment for order flow · {monthLong(d.meta.month)} data</Kicker>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[46px]">
          Do brokers that get paid for your orders give you worse prices?
        </h1>
        <p className="mt-5 text-[19px] leading-relaxed text-ink">
          <b className="font-semibold">Not reliably.</b> The two brokers paid the most ({top2.map((r) => r.name).join(" and ")}) do give below-average prices,
          but some brokers paid nothing give the worst prices of all. What matters more is <b className="font-semibold">which broker you use</b>:
          the same market makers fill some brokers' customers far better than others'.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            [String(spRows.length), `US brokers compared, using reports they must publish by law (${paid.length} also report payments)`],
            [rhoY != null && rhoN != null ? `${rhoY.toFixed(2)} – ${rhoN.toFixed(2)}` : "–", "strength of the link between being paid and worse prices (0 = none, 1 = perfect)"],
            [cheap.length ? dollars(Math.max(...cheap)) : "–", "most extra a customer paid on a $10,000 big-company trade (worst broker). At the best, nothing."],
          ].map(([n, l]) => (
            <div key={l} className="border-t-2 border-ink pt-3">
              <div className="text-[30px] font-semibold leading-none text-ink">{n}</div>
              <div className="mt-2 text-[13.5px] leading-snug text-ink2">{l}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ---------- 1. spread ---------- */}
      <Step n={1} title="A stock never has just one price">
        <p>At any moment there are two prices: the most someone will pay (the <b>bid</b>) and the least someone will sell for (the <b>ask</b>).
          The gap is the <b>spread</b>. Halfway between is the <b>midpoint</b>, the fairest price you could hope for.</p>
        <Figure title="A $100 stock with a 6-cent spread"><SpreadDiagram /></Figure>
        <p>When you buy, you usually pay somewhere between the midpoint and the ask. So every broker can be scored the same way:
          <b> how much of the spread did its customers pay?</b> 0% is the fair midpoint, 100% is the full ask. Lower is better.</p>
      </Step>

      {/* ---------- 2. customer cost ---------- */}
      <Step n={2} title="Some brokers get you much better prices than others">
        <p>Since August 2026, US law (SEC Rule 605) makes every large broker publish how well its customers' orders were filled.</p>
        <Figure title="How much of the spread customers paid" sub={`${monthLong(d.meta.month)} · market orders under $200,000 · best to worst`} toggle={toggle}
          caption={<>The dollar column is what that means on a $10,000 trade. It also depends on how wide the spreads were on the stocks each broker's customers bought, so the two columns don't rank identically.</>}>
          <RankDots label="Share of the spread customers paid, by broker" leftNote="fair midpoint" rightNote="full ask" colTitle="on $10,000"
            rows={[...rows].sort((a, b) => a.cust! - b.cust!).map((r) => ({
              id: r.id, label: r.name, value: r.cust!, col: r.cost10k == null ? "" : dollars(r.cost10k),
              tip: <><TipTitle>{r.name}</TipTitle><TipRow label="Share of spread paid" value={pct(r.cust, 1)} />
                <TipRow label="Extra cost on $10,000" value={dollars(r.cost10k)} /><TipRow label="Orders price-improved" value={pct(r.pi)} /></>,
            }))} />
        </Figure>
      </Step>

      {/* ---------- 3. payments ---------- */}
      <Step n={3} title="Many brokers are paid to send your order somewhere">
        <p>Most brokers don't send your order to the stock exchange. They send it to a <b>market maker</b>, a trading firm such as Citadel or Virtu,
          which fills it, and often <b>pays the broker</b> for it. This is <b>payment for order flow</b>, and it is how many "zero-commission" apps make money.</p>
        <Figure title="How your order is handled"><FlowDiagram /></Figure>
        <p>The worry is a conflict of interest: a broker could send your order to whoever pays most, not whoever gives you the best price.
          Brokers report these payments too (SEC Rule 606). Here they are as a share of the same spread.</p>
        <Figure title="How much of the spread the broker was paid" sub={`${quarterLong(d.meta.quarter)} · market orders · most to least`} toggle={toggle}
          caption={`Not shown, no payment report of their own: ${rows.filter((r) => r.payPct == null).map((r) => r.name).join(", ")}. Negative = the broker pays the market maker.`}>
          <RankBars label="Share of the spread paid to each broker" fmt={(v) => `${v}%`} onClick={(id) => go(`broker/${id}`)}
            rows={[...paid].sort((a, b) => b.payPct! - a.payPct!).map((r) => ({
              id: r.id, label: r.name, value: r.payPct!, text: Math.abs(r.payPct!) < 0.05 ? "none" : pct(r.payPct, 1),
              tip: <><TipTitle>{r.name}</TipTitle><TipRow label="Paid, share of spread" value={pct(r.payPct, 1)} /><TipRow label="Per 100 shares" value={`${r.cph?.toFixed(1)}¢`} /></>,
            }))} />
        </Figure>
      </Step>

      {/* ---------- 4. the key chart ---------- */}
      <Step n={4} title="Put the two together, and the pattern is weak">
        <p>Each dot is a broker. If being paid made prices worse, the dots would climb from the bottom-left corner to the top-right one.</p>
        <Figure title="Payment received vs. price paid by customers" sub="Both as a share of the spread · lines mark the middle broker" toggle={toggle}>
          <Scatter xLabel="Broker is paid more →" yLabel="Customers pay more →" onClick={(id) => go(`broker/${id}`)}
            corners={{ tl: "Paid little, poor prices", tr: "What critics expect: paid more, worse prices", trShort: "High pay, poor prices", bl: "Paid little, good prices", br: "Paid more, good prices" }}
            points={paid.map((r) => ({ id: r.id, label: r.name, x: r.payPct!, y: r.cust!,
              tip: <><TipTitle>{r.name}</TipTitle><TipRow label="Broker paid" value={pct(r.payPct, 1)} /><TipRow label="Customers paid" value={pct(r.cust, 1)} /></> }))} />
          <div className="mt-6 text-[14px] font-semibold text-ink">How strong is the link?</div>
          <Meter rho={rho} />
        </Figure>
        <p className="border-l-[3px] border-ink pl-4 text-[18px] text-ink">
          For {sp === "Y" ? "S&P 500 stocks" : "other stocks"} the link is <b>{rho == null ? "unclear" : strength(rho)}</b>
          {rho != null && ` (${signed(rho, 2)} across ${paid.length} brokers)`}: payment alone does not tell you whether a broker will get you a good price.
        </p>
      </Step>

      {/* ---------- 5. same stocks, same market makers ---------- */}
      <Step kicker="The bigger story" title="Same stocks, same market makers, very different prices">
        <p>Maybe some brokers just look worse because their customers trade harder stocks? The detailed reports let us check: for every stock and order size,
          each broker is compared with the others <b>on exactly the same stocks</b>.</p>
        <Figure title="Price on the same stocks, compared with other brokers" sub={`${monthLong(d.meta.detailMonth)} · market orders · percentage points of the spread`} toggle={toggle}
          caption={<>Bars: how much more (red) or less (blue) of the spread a broker's customers paid than other brokers' customers did on identical stocks and order sizes.
            Black tick: what the broker's mix of market makers alone would predict.</>}>
          <Legend items={[{ color: "var(--better)", label: "Better than peers" }, { color: "var(--worse)", label: "Worse than peers" }, { color: "var(--ink)", label: "Predicted from its market makers", kind: "tick" }]} />
          <GapBars label="Same-stock price gap per broker" onClick={(id) => go(`broker/${id}`)}
            rows={gaps.map((g) => ({ id: g.id, label: short(g.id), gap: g.gap, implied: implied.get(g.id) ?? null,
              tip: <><TipTitle>{short(g.id)}</TipTitle><TipRow label="Its customers paid" value={pct(g.own, 1)} />
                <TipRow label="Other brokers, same stocks" value={pct(g.peers, 1)} /><TipRow label="Gap" value={signed(g.gap, 1, " pts")} />
                {implied.has(g.id) && <TipRow label="Predicted from market makers" value={signed(implied.get(g.id)!, 1, " pts")} />}
                <div className="mt-1 text-muted">{g.cells.toLocaleString()} stock × size comparisons</div></> }))} />
        </Figure>
        <p>The ticks barely move while the bars swing from far left to far right. {shared.length >= 3 && <>Robinhood and Schwab both send most orders to {shared.slice(0, 4).join(", ")},
          yet Robinhood's customers paid {signed(gapOf("HOOD") ?? null, 0)} points and Schwab's {signed(gapOf("CHAS") ?? null, 0)} points against peers on the same stocks.</>}
          {" "}<b>Market makers price each broker's customers differently</b>, so the deal a broker strikes matters more than where it sends the order
          {evRouting && <> (routing predicts actual prices with a correlation of just {signed(evRouting.rho, 2)})</>}.</p>
        {evClientele && evPaySame && <p>What does line up: brokers whose customers make bigger trades get better prices on the same stocks
          ({signed(evClientele.rho, 2)}, a {strength(evClientele.rho)} link). Payment does not reach statistical significance even here ({signed(evPaySame.rho, 2)}, p = {evPaySame.p.toFixed(2)}).</p>}
      </Step>

      {/* ---------- 6. follow the money ---------- */}
      <Step kicker="Follow the money" title="Where the spread you pay actually goes">
        <p>Rule 605 also reports how much the market maker still keeps a minute after your trade. That splits what you paid into three parts.</p>
        <Figure title="What customers paid, split three ways" sub={`${monthLong(d.meta.month)} · market orders · % of the spread`} toggle={toggle}
          caption="Brokers whose figures don't add up sensibly (e.g. Wealthfront, which sends almost no market orders) are left out.">
          <Legend items={[{ color: "var(--s1)", label: "Paid on to the broker" }, { color: "var(--s2)", label: "Kept by the market maker" }, { color: "var(--context)", label: "Lost to price moves after the trade" }]} />
          <MoneyBars rows={money.map((m) => ({ id: m.id, label: short(m.id), toBroker: m.toBroker, toMM: m.toMM, moved: m.moved, cust: m.cust,
            tip: <><TipTitle>{short(m.id)}</TipTitle><TipRow label="Customer paid" value={pct(m.cust, 1)} /><TipRow label="Market maker kept (1 min)" value={pct(m.mmKeeps, 1)} color="var(--s2)" />
              <TipRow label="…of which paid to broker" value={pct(m.pay, 1)} color="var(--s1)" /></> }))} />
        </Figure>
        <p>{share("HOOD") != null && <>Robinhood passes on about <b>{share("HOOD")!.toFixed(0)}%</b> of what the market maker keeps; </>}
          {share("SOFI") != null && <>SoFi about {share("SOFI")!.toFixed(0)}%. </>}
          Low payment does not mean customer-friendly: at brokers paid little, the market maker simply keeps more.</p>
      </Step>

      {/* ---------- 7. options ---------- */}
      <Step kicker="The blind spot" title="Most of the money is in options, which the new rule doesn't cover">
        <Figure title="Payments received by the brokers tracked here" sub="All order types · US$ per quarter · Rule 606">
          <Legend items={[{ color: "var(--s1)", label: "S&P 500 stocks" }, { color: "var(--s2)", label: "Other stocks" }, { color: "var(--s3)", label: "Options" }]} />
          <Columns x={qs} xFmt={quarterShort} tipTitle={quarterLong} yFmt={dollars} label="Payments per quarter by segment"
            series={[{ name: "S&P 500 stocks", color: "var(--s1)", values: spx }, { name: "Other stocks", color: "var(--s2)", values: oth }, { name: "Options", color: "var(--s3)", values: opt }]} />
        </Figure>
        <p>Payments to these brokers grew from <b>{dollars(totFirst)}</b> to <b>{dollars(totLast)}</b> a quarter, and options make up
          <b> {totLast ? ((100 * opt[last]) / totLast).toFixed(0) : "–"}%</b>. Rule 605 only covers stocks, so there is no public record of whether options customers get good prices.</p>
      </Step>

      {/* ---------- caveats + CTA ---------- */}
      <Step kicker="Before you draw conclusions" title="What this can't tell you">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>It's early data.</b> Brokers have only had to publish these reports since August 2026, and only about a dozen also report payments.</li>
          <li><b>A link is not a cause.</b> Even a strong link wouldn't prove payments cause worse prices.</li>
          <li><b>Some brokers don't report payments themselves.</b> A partner firm routes their orders, so their payments are invisible here.</li>
          <li><b>Timing.</b> Fills are monthly; payments are quarterly and published later, so the latest fills are compared with the latest available payments.</li>
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6">
          <div><div className="text-[16px] font-semibold text-ink">Want to dig deeper?</div>
            <div className="text-[14.5px] text-ink2">Filter by order size and type, open any broker, and see which market makers get each broker's orders.</div></div>
          <a href="#/explore" className="rounded-xl bg-ink px-4 py-2.5 text-[14.5px] font-semibold text-page hover:opacity-90">Explore the data →</a>
        </div>
      </Step>
    </div>
  );
}
