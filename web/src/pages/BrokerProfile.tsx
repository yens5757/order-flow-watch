import { useMemo } from "react";
import { EChart } from "../charts/EChart";
import { bandLine, donut, hBars, lines, stackedColumns } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { Card, Empty, Icon, Kpi, Select } from "../components/ui";
import { brokerRows, execKey, metric, nameOf, SIZE_STEPS, SP_LABEL, type Data, type Filters } from "../lib/data";
import { cents, dollars, num, pct, quarterLong, quarterShort, signed, usd2 } from "../lib/format";
import { go } from "../lib/hooks";
import { median } from "../lib/stats";
import { useTheme } from "../lib/theme";

const SIZE_SHORT: Record<number, string> = { 0: "<$250", 250: "$250", 1000: "$1k", 5000: "$5k", 10000: "$10k", 20000: "$20k", 50000: "$50k", 200000: "$200k+" };
const LOTS: Record<string, string> = { FRACT: "Fractional shares", ODD: "Odd lots (<100 sh)", ROUND: "Round lots (100+ sh)" };

export default function BrokerProfile({ d, f, set, id }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; id: string }) {
  const { t } = useTheme();
  const firm = d.byId[id] ?? d.brokers[0];
  const r = metric(d, firm, f);
  const all = brokerRows(d, f);
  const rank = r.cust == null ? null : all.filter((o) => o.cust! < r.cust!).length + 1;
  const gap = d.sameStock.brokers.find((g) => g.id === firm.id && g.sp === f.sp);
  const order = [...d.firms].sort((a, b) => a.short.localeCompare(b.short));
  const idx = order.findIndex((o) => o.id === firm.id);
  const prev = order[(idx - 1 + order.length) % order.length], next = order[(idx + 1) % order.length];

  // cost by order size: this broker vs every broker
  const size = SIZE_STEPS.map((b) => {
    const v = (bid: string) => { const e = d.exec.get(execKey(bid, f.month, f.sp, f.ot, b)); return e?.efq == null ? null : e.efq * 100; };
    const others = d.brokers.map((o) => v(o.id)).filter((x): x is number => x != null);
    return { v: v(firm.id), med: median(others), lo: others.length ? Math.min(...others) : null, hi: others.length ? Math.max(...others) : null };
  });
  const sizeChart = useMemo(() => bandLine(t, SIZE_STEPS.map((b) => SIZE_SHORT[b]),
    { v: size.map((s) => s.v), med: size.map((s) => s.med), lo: size.map((s) => s.lo), hi: size.map((s) => s.hi) },
    { name: firm.short, fmt: (v) => `${v.toFixed(0)}%` }), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  // routing: where its orders go (top 6 + other)
  const venues = d.venues.filter((v) => v.crd === firm.crd && v.q === f.quarter && v.sp === f.sp)
    .map((v) => ({ venue: v.venue, share: v.share[f.ot] ?? 0, cph: v.cph[f.ot] })).filter((v) => v.share > 0).sort((a, b) => b.share - a.share);
  const head = venues.slice(0, 6), tail = venues.slice(6);
  const slices = [
    ...head.map((v, i) => ({ name: v.venue, v: v.share, color: t.s[i], rows: [[t.s[i], "Share of orders", pct(v.share, 1)], [null, "Paid per 100 shares", cents(v.cph)]] as [string | null, string, string][] })),
    ...(tail.length ? [{ name: `Other (${tail.length})`, v: tail.reduce((a, v) => a + v.share, 0), color: t.context }] : []),
  ];
  const routing = useMemo(() => donut(t, slices, (v) => `${v.toFixed(0)}%`), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  // payments over time
  const qs = d.meta.quarters;
  const hist = qs.map((q) => (firm.crd ? d.pay.get(`${firm.crd}|${q}|${f.sp}`)?.[f.ot] ?? null : null));
  const histChart = useMemo(() => lines(t, qs.map(quarterShort), [{ name: "Paid per 100 shares", values: hist, color: t.s[0] }],
    { fmt: (v) => `${v.toFixed(0)}¢`, area: false, min: 0 }), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps
  const segs = [["SP500", "S&P 500", t.s[0]], ["OtherStocks", "Other stocks", t.s[1]], ["Options", "Options", t.s[2]]] as const;
  const usd = segs.map(([k, name, color]) => ({ name, color, values: qs.map((q) => d.usd.filter((u) => u.crd === firm.crd && u.q === q && u.seg === k).reduce((a, u) => a + Math.max(0, u.usd), 0)) }));
  const usdTotal = usd.reduce((a, s) => a + s.values.reduce((x, y) => x + y, 0), 0);
  const usdChart = useMemo(() => stackedColumns(t, qs.map(quarterShort), usd, dollars), [t, firm]); // eslint-disable-line react-hooks/exhaustive-deps

  // fractional / odd / round lots
  const lots = d.lots.filter((l) => l.id === firm.id && l.sp === f.sp).sort((a, b) => ["FRACT", "ODD", "ROUND"].indexOf(a.lot) - ["FRACT", "ODD", "ROUND"].indexOf(b.lot));
  const lotChart = useMemo(() => hBars(t, lots.map((l) => ({ id: l.lot, name: LOTS[l.lot], v: l.efq,
    rows: [[t.s[1], "Customer pays", pct(l.efq, 1)], [null, "Orders", num(l.orders)], [null, "Dollar volume", dollars(l.dollars)]] })),
    { fmt: (v) => `${v.toFixed(0)}%`, color: t.s[1] }), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-10">
        <div>
          <a href="#/brokers" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink2 hover:text-ink"><Icon name="back" size={15} />All brokers</a>
          <h1 className="mt-2 font-display text-[34px] font-extrabold tracking-tight text-ink sm:text-[40px]">{firm.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            {[firm.type === "clearing_firm" ? "Clearing firm" : "Retail broker", `Rule 605 code ${firm.id}`, firm.crd ? `606 filer CRD ${firm.crd}` : "No 606 report of its own"].map((s) => (
              <span key={s} className="rounded-full border border-line bg-surface px-2.5 py-1 text-ink2">{s}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`#/broker/${prev.id}`} aria-label={`Previous: ${prev.short}`} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink2 hover:border-accent hover:text-ink"><Icon name="left" /></a>
          <Select label="Broker" value={firm.id} onChange={(v) => go(`broker/${v}`)} options={order.map((o) => [o.id, nameOf(o)])} />
          <a href={`#/broker/${next.id}`} aria-label={`Next: ${next.short}`} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink2 hover:border-accent hover:text-ink"><Icon name="right" /></a>
        </div>
      </div>
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "quarter"]} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Customer pays" value={pct(r.cust, 0)} sub={rank ? `of the spread · #${rank} best of ${all.length}` : "of the spread"} />
        <Kpi label="Broker is paid" value={pct(r.payPct, 1)} sub={r.cph != null ? `${cents(r.cph)} per 100 shares` : "no 606 payment data"} />
        <Kpi label="Same-stock gap" value={gap ? signed(gap.gap, 1) : "–"} tone={gap ? (gap.gap < 0 ? "good" : "bad") : undefined}
          sub={gap ? `points vs other brokers on identical trades` : "not enough detailed data"} />
        <Kpi label="Cost per $10k" value={usd2(r.cost10k)} sub="above the midpoint price" />
        <Kpi label="Avg order" value={r.sz == null ? "–" : `${num(r.sz)} sh`} sub={r.pi != null ? `${pct(r.pi, 0)} price-improved` : undefined} />
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Cost by order size" sub={`${SP_LABEL[f.sp]} · ${firm.short} against every other broker`}>
          <EChart option={sizeChart} height={300} label="Customer cost by order size" />
        </Card>
        <Card title="Where its orders go" sub={`Share of orders by market maker · ${quarterLong(f.quarter)}`}>
          {slices.length ? <EChart option={routing} height={300} label="Routing by market maker" /> : <Empty>No 606 routing report for this broker and quarter.</Empty>}
        </Card>
        <Card title="Payment rate over time" sub="Cents per 100 shares, order-weighted across market makers">
          {hist.some((v) => v != null) ? <EChart option={histChart} height={280} label="Payment rate per quarter" /> : <Empty>No 606 payment data.</Empty>}
        </Card>
        <Card title="Payments received, by segment" sub="Dollars per quarter from 606 reports">
          {usdTotal > 0 ? <EChart option={usdChart} height={280} label="Payments received per quarter" /> : <Empty>No dollar amounts reported.</Empty>}
        </Card>
        {lots.length > 0 && (
          <Card className="lg:col-span-2" title="Fractional, odd and round lots" sub={`${SP_LABEL[f.sp]} · share of the spread the customer pays, by order lot`}
            info="Fractional-share orders are often filled differently from whole shares. Schwab's fractional orders pay ~46% of the spread vs ~6% for whole shares.">
            <EChart option={lotChart} height={lots.length * 40 + 20} label="Customer cost by lot type" />
          </Card>
        )}
      </div>
    </div>
  );
}
