import { RankBars } from "../charts/bars";
import { Columns, Lines } from "../charts/xy";
import { FilterBar } from "../components/FilterBar";
import { SortTable, TableTwin } from "../components/SortTable";
import { TipRow, TipTitle } from "../components/Tooltip";
import { Card, Empty, Legend, Select, Tile } from "../components/ui";
import { brokerRows, BUCKET_LABEL, execKey, metric, nameOf, OT_LABEL, SIZE_STEPS, SP_LABEL, type Data, type Filters } from "../lib/data";
import { cents, dollars, num, pct, quarterLong, quarterShort, signed } from "../lib/format";
import { go } from "../lib/hooks";
import { median } from "../lib/stats";

export default function Broker({ d, f, set, id }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; id: string }) {
  const firm = d.byId[id] ?? d.brokers[0];
  const r = metric(d, firm, f);
  const all = brokerRows(d, f);
  const rank = r.cust == null ? null : all.filter((o) => o.cust! < r.cust!).length + 1;
  const gap = d.sameStock.brokers.find((g) => g.id === firm.id && g.sp === f.sp);
  const usdQ = d.usd.filter((u) => u.crd === firm.crd && u.q === f.quarter);
  const mix = d.orderMix.find((m) => m.id === firm.id);
  const lots = d.lots.filter((l) => l.id === firm.id && l.sp === f.sp);
  const lotCost = (k: string) => lots.find((l) => l.lot === k);

  // Customer cost by order size: this broker vs the median broker, with the range as a band
  const size = SIZE_STEPS.map((b) => {
    const v = (bid: string) => { const e = d.exec.get(execKey(bid, f.month, f.sp, f.ot, b)); return e?.efq == null ? null : e.efq * 100; };
    const others = d.brokers.map((o) => v(o.id)).filter((x): x is number => x != null);
    return { b, v: v(firm.id), med: median(others), lo: others.length ? Math.min(...others) : null, hi: others.length ? Math.max(...others) : null };
  });
  const venues = d.venues.filter((v) => v.crd === firm.crd && v.q === f.quarter && v.sp === f.sp)
    .map((v) => ({ venue: v.venue, share: v.share[f.ot] ?? 0, cph: v.cph[f.ot] })).filter((v) => v.share > 0).sort((a, b) => b.share - a.share);
  const hist = d.meta.quarters.map((q) => (firm.crd ? d.pay.get(`${firm.crd}|${q}|${f.sp}`)?.[f.ot] ?? null : null));
  const segs = [["SP500", "S&P 500", "var(--s1)"], ["OtherStocks", "Other stocks", "var(--s2)"], ["Options", "Options", "var(--s3)"]] as const;
  const usd = segs.map(([k, name, color]) => ({ name, color, values: d.meta.quarters.map((q) => d.usd.filter((u) => u.crd === firm.crd && u.q === q && u.seg === k).reduce((a, u) => a + Math.max(0, u.usd), 0)) }));
  const short: Record<number, string> = { 0: "<$250", 250: "$250", 1000: "$1k", 5000: "$5k", 10000: "$10k", 20000: "$20k", 50000: "$50k", 200000: "$200k+" };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <a href="#/explore" className="text-[13px] text-ink2 hover:text-ink">← All brokers</a>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">{firm.name}</h1>
          <div className="text-[13px] text-muted">{firm.type === "clearing_firm" ? "Clearing firm" : "Retail broker"} · Rule 605 code {firm.id} · {firm.crd ? `606 filer CRD ${firm.crd}` : "no 606 report of its own"}</div>
        </div>
        <Select label="Broker" value={firm.id} onChange={(v) => go(`broker/${v}`)}
          options={[...d.firms].sort((a, b) => a.short.localeCompare(b.short)).map((o) => [o.id, nameOf(o)])} />
      </div>
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "b", "month", "quarter"]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Broker is paid" value={r.payPct == null ? "–" : pct(r.payPct, 1)} note={r.payPct == null ? `no 606 data for ${quarterLong(f.quarter)}` : `of the spread · ${cents(r.cph)} per 100 shares`} />
        <Tile label="Customer pays" value={pct(r.cust, 1)} note={rank ? `of the spread · ${rank} of ${all.length} (1 = best)` : "no fill data"} />
        <Tile label="On the same stocks" value={gap ? signed(gap.gap, 0, " pts") : "–"} note={gap ? `vs other brokers (${gap.gap < 0 ? "better" : "worse"}) · market orders` : "too few comparable stocks"} />
        <Tile label="Orders" value={mix ? num(mix.orders) : "–"} note={mix ? `${pct(mix.market)} market orders · ${pct(mix.fractional ?? 0)} fractional` : ""} />
        <Tile label={`Payments received, ${quarterShort(f.quarter)}`} value={dollars(usdQ.length ? usdQ.reduce((a, u) => a + u.usd, 0) : null)} note="all order types, incl. options" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Customer cost by order size" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · % of the spread paid`}>
          <Legend items={[{ color: "var(--s1)", label: firm.short, kind: "line" }, { color: "var(--context)", label: "Median broker", kind: "line" }, { color: "var(--wash)", label: "Range across brokers" }]} />
          {size.some((s) => s.v != null)
            ? <Lines label="Customer cost by order size" x={size.map((s) => String(s.b))} xFmt={(c) => short[+c]} tipTitle={(c) => BUCKET_LABEL[+c]} yFmt={(v) => `${v.toFixed(0)}%`}
                band={size.map((s) => ({ lo: s.lo, hi: s.hi }))}
                series={[{ name: "Median broker", color: "var(--context)", values: size.map((s) => s.med), dots: false }, { name: firm.short, color: "var(--s1)", values: size.map((s) => s.v) }]} />
            : <Empty>No Rule 605 data for this selection.</Empty>}
          <TableTwin><SortTable name={`${firm.id}-by-size`} rows={size} initial={{ key: "b", dir: "asc" }} cols={[
            { key: "b", label: "Order size", get: (s) => s.b, fmt: (v: number) => BUCKET_LABEL[v] },
            { key: "v", label: firm.short, num: true, get: (s) => s.v, fmt: (v: number | null) => pct(v, 1) },
            { key: "med", label: "Median broker", num: true, get: (s) => s.med, fmt: (v: number | null) => pct(v, 1) }]} /></TableTwin>
        </Card>
        <Card title="Where the orders go" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${quarterLong(f.quarter)} · share of orders · payment per 100 shares`}>
          {venues.length
            ? <RankBars label="Share of orders by venue" fmt={(v) => `${v}%`} minMax={10} nameWidth={150}
                rows={venues.map((v) => ({ id: v.venue, label: v.venue.length > 22 ? `${v.venue.slice(0, 21)}…` : v.venue, value: v.share, text: `${pct(v.share)} · ${cents(v.cph)}`,
                  tip: <><TipTitle>{v.venue}</TipTitle><TipRow label="Share of orders" value={pct(v.share, 1)} /><TipRow label="Payment" value={`${cents(v.cph)} per 100 sh`} />
                    {(v.cph ?? 0) < 0 && <div className="mt-1 text-muted">Negative = the broker pays the venue</div>}</> }))} />
            : <Empty>{firm.crd ? "No routing reported for this selection." : "This broker files no 606 report of its own: its clearing firm routes the orders."}</Empty>}
        </Card>
        <Card title="Payment rate over time" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · cents per 100 shares`}>
          {hist.some((v) => v != null)
            ? <Lines label="Payment rate over time" x={d.meta.quarters} xFmt={quarterShort} tipTitle={quarterLong} yFmt={(v) => `${v.toFixed(0)}¢`} height={240}
                series={[{ name: "Payment", color: "var(--s1)", values: hist }]} />
            : <Empty>No 606 payment data for this broker.</Empty>}
        </Card>
        <Card title="Total payments received per quarter" sub="All order types · US$ · Rule 606">
          <Legend items={segs.map(([, name, color]) => ({ color, label: name }))} />
          {usd.some((s) => s.values.some((v) => v > 0))
            ? <Columns label="Payments per quarter" x={d.meta.quarters} xFmt={quarterShort} tipTitle={quarterLong} yFmt={dollars} height={240} series={usd} />
            : <Empty>No positive payments reported.</Empty>}
        </Card>
      </div>
      {lots.length > 0 && (
        <Card title="Fractional vs whole-share orders" sub={`${SP_LABEL[f.sp]} · market orders under $200k · ${d.meta.detailMonth.slice(0, 4)}-${d.meta.detailMonth.slice(4)}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["FRACT", "ODD", "ROUND"] as const).map((k) => {
              const l = lotCost(k);
              return <Tile key={k} label={{ FRACT: "Fractional shares", ODD: "Odd lots (1–99 shares)", ROUND: "Round lots (100+ shares)" }[k]}
                value={l ? pct(l.efq, 1) : "–"} note={l ? `of the spread · ${num(l.orders)} orders` : "none"} />;
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
