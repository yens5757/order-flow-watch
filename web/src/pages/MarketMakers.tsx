import { useState } from "react";
import { GapBars } from "../charts/bars";
import { Heatmap } from "../charts/special";
import { Lines } from "../charts/xy";
import { FilterBar } from "../components/FilterBar";
import { SortTable, TableTwin } from "../components/SortTable";
import { TipRow, TipTitle } from "../components/Tooltip";
import { Card, Empty, Segmented } from "../components/ui";
import { nameOf, OT_LABEL, SP_LABEL, type Data, type Filters } from "../lib/data";
import { cents, monthLong, pct, quarterLong, quarterShort, signed } from "../lib/format";
import { go } from "../lib/hooks";

const LINE_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

export default function MarketMakers({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const [metric, setMetric] = useState<"share" | "pay">("share");
  const mmName = Object.fromEntries(d.marketMakers.map((m) => [m.id, m.name]));
  const gaps = d.sameStock.marketMakers.filter((g) => g.sp === f.sp).sort((a, b) => a.gap - b.gap);

  // Routing heatmap: brokers x venues, tail folded into "Other"
  const brokers = d.firms.filter((b) => b.crd && (f.clearing || b.type !== "clearing_firm"));
  const rows = d.venues.filter((v) => v.q === f.quarter && v.sp === f.sp && brokers.some((b) => b.crd === v.crd));
  const tot = new Map<string, number>();
  rows.forEach((v) => tot.set(v.venue, (tot.get(v.venue) ?? 0) + (v.share[f.ot] ?? 0)));
  const top = [...tot].filter(([, s]) => s >= 15).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([v]) => v);
  const cols = metric === "share" && tot.size > top.length ? [...top, "Other"] : top;
  const brs = brokers.filter((b) => rows.some((v) => v.crd === b.crd && (v.share[f.ot] ?? 0) > 0));
  const cell = (bid: string, venue: string) => {
    const crd = d.byId[bid].crd;
    const vs = rows.filter((v) => v.crd === crd && (venue === "Other" ? !top.includes(v.venue) : v.venue === venue));
    if (!vs.length) return null;
    if (metric === "share") return vs.reduce((a, v) => a + (v.share[f.ot] ?? 0), 0);
    return (vs[0].share[f.ot] ?? 0) > 0 ? vs[0].cph[f.ot] : null;
  };

  // FINRA: share of off-exchange volume, top market makers
  const qs = [...new Set(d.otc.map((o) => o.q))].sort();
  const firms = [...new Set(d.otc.map((o) => o.firm))];
  const otcSeries = firms.map((name, i) => ({
    name: name.replace(/ (Securities|Americas|Financial|Execution)$/, ""), color: LINE_COLORS[i % 6],
    values: qs.map((q) => d.otc.find((o) => o.q === q && o.firm === name)?.share ?? null),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-24 pt-8">
      <div><h1 className="text-[28px] font-semibold tracking-tight text-ink">Market makers</h1>
        <p className="mt-1 text-[14.5px] text-ink2">The trading firms that actually fill retail orders: how good their prices are, how big they are, and which brokers send them orders.</p></div>
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "quarter", "clearing"]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Price quality on the same stocks" sub={`${SP_LABEL[f.sp]} · market orders · ${monthLong(d.meta.detailMonth)} · vs the other market makers`}>
          {gaps.length ? <GapBars label="Market maker same-stock price gap" rows={gaps.map((g) => ({
            id: g.id, label: (mmName[g.id] ?? g.id).replace(" Securities", "").replace(" Americas", "").replace(" Financial", "").replace(" Execution", ""), gap: g.gap,
            tip: <><TipTitle>{mmName[g.id]}</TipTitle><TipRow label="Its customers paid" value={pct(g.own, 1)} /><TipRow label="Others, same stocks" value={pct(g.peers, 1)} />
              <TipRow label="Gap" value={signed(g.gap, 1, " pts")} /></> }))} /> : <Empty>No market-maker reports for this month.</Empty>}
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">A market maker's report covers every order it received, from many brokers, so its score mixes its own quality with the brokers that send it orders.</p>
        </Card>
        <Card title="Share of off-exchange stock volume" sub="FINRA OTC transparency data · NMS stocks · % of all off-exchange (non-ATS) shares">
          {qs.length ? <Lines label="Market-maker share of off-exchange volume" x={qs} xFmt={quarterShort} tipTitle={quarterLong} yFmt={(v) => `${v.toFixed(0)}%`} endLabels series={otcSeries} height={300} />
            : <Empty>No FINRA data loaded.</Empty>}
        </Card>
      </div>
      <Card title="Which market makers get each broker's orders"
        sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${quarterLong(f.quarter)} · ${metric === "share" ? "share of the broker's orders" : "payment to the broker, ¢ per 100 shares (red = the broker pays)"}`}
        right={<Segmented size="sm" value={metric} onChange={setMetric} options={[["share", "Share of orders"], ["pay", "Payment rate"]]} />}>
        {brs.length && cols.length ? <Heatmap rows={brs.map((b) => ({ id: b.id, label: nameOf(b) }))} cols={cols} value={cell} diverging={metric === "pay"}
          fmt={(v) => (metric === "share" ? `${Math.round(v)}%` : v.toFixed(0))} onRow={(id) => go(`broker/${id}`)}
          cellTip={(bid, c) => { const v = cell(bid, c); return <><TipTitle>{nameOf(d.byId[bid])} → {c}</TipTitle>
            <TipRow label={metric === "share" ? "Share of orders" : "Payment"} value={v == null ? "–" : metric === "share" ? pct(v, 1) : `${cents(v)} per 100 sh`} /></>; }} />
          : <Empty>No routing data for this selection.</Empty>}
        <p className="mt-3 text-[13px] text-muted">Most brokers use the same handful of market makers, yet get very different prices (see the story). Switch to <b className="text-ink2">Payment rate</b>: most brokers charge every market maker the same rate.</p>
        <TableTwin><SortTable name="routing" initial={{ key: "name", dir: "asc" }} rows={brs}
          cols={[{ key: "name", label: "Broker", get: (b) => nameOf(b) }, ...cols.map((c) => ({ key: c, label: c, num: true, get: (b: typeof brs[number]) => cell(b.id, c),
            fmt: (v: number | null) => (metric === "share" ? pct(v, 1) : cents(v)) }))]} /></TableTwin>
      </Card>
    </div>
  );
}
