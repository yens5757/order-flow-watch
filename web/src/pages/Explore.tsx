import { useMemo, useState } from "react";
import { PairedBars } from "../charts/bars";
import { Scatter } from "../charts/xy";
import { FilterBar } from "../components/FilterBar";
import { SortTable, TableTwin, type Col } from "../components/SortTable";
import { TipRow, TipTitle } from "../components/Tooltip";
import { Card, Empty, Legend, Segmented, Select, Tile } from "../components/ui";
import { brokerRows, BUCKET_LABEL, OT_LABEL, SP_LABEL, type Data, type Filters, type Metric } from "../lib/data";
import { cents, dollars, num, pct, quarterLong, signed, strength } from "../lib/format";
import { go } from "../lib/hooks";
import { median, spearman } from "../lib/stats";

type Sort = "pay" | "cust" | "custasc" | "pi" | "name";
const SORTS: Record<Sort, (a: Metric, b: Metric) => number> = {
  pay: (a, b) => (b.payPct ?? -1e9) - (a.payPct ?? -1e9) || a.name.localeCompare(b.name),
  cust: (a, b) => b.cust! - a.cust!,
  custasc: (a, b) => a.cust! - b.cust!,
  pi: (a, b) => (b.pi ?? -1) - (a.pi ?? -1),
  name: (a, b) => a.name.localeCompare(b.name),
};

export default function Explore({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const [view, setView] = useState<"bars" | "scatter">("bars");
  const [sort, setSort] = useState<Sort>("pay");
  const rows = useMemo(() => brokerRows(d, f), [d, f]);
  const both = rows.filter((r) => r.f.type === "broker" && r.payPct != null);
  const rho = spearman(both.map((r) => r.payPct!), both.map((r) => r.cust!));
  const topPay = [...rows].filter((r) => r.payPct != null).sort((a, b) => b.payPct! - a.payPct!)[0];
  const worst = [...rows].sort((a, b) => b.cust! - a.cust!)[0], best = [...rows].sort((a, b) => a.cust! - b.cust!)[0];
  const unpaidBad = rows.filter((r) => r.payPct != null && r.payPct <= 1 && r.cust! >= 40);
  const no606 = rows.filter((r) => r.payPct == null);
  const tip = (r: Metric) => <><TipTitle>{r.name}</TipTitle>
    <TipRow label="Broker is paid" value={r.payPct == null ? "no 606 data" : `${pct(r.payPct, 1)} (${cents(r.cph)}/100 sh)`} color="var(--s1)" />
    <TipRow label="Customer pays" value={pct(r.cust, 1)} color="var(--s2)" /><TipRow label="Price improved" value={pct(r.pi, 1)} />
    <TipRow label="Avg order" value={r.sz == null ? "–" : `$${num(r.sz)}`} /><div className="mt-1 text-muted">Click for broker detail</div></>;

  const cols: Col<Metric>[] = [
    { key: "name", label: "Broker", get: (r) => r.name },
    { key: "pay", label: "Paid, % of spread", num: true, get: (r) => r.payPct, fmt: (v: number | null) => pct(v, 1) },
    { key: "cph", label: "Paid, ¢/100 sh", num: true, get: (r) => r.cph, fmt: (v: number | null) => cents(v) },
    { key: "cust", label: "Customer pays, % of spread", num: true, get: (r) => r.cust, fmt: (v: number | null) => pct(v, 1) },
    { key: "c10", label: "Extra $ on $10k", num: true, get: (r) => r.cost10k, fmt: (v: number | null) => dollars(v) },
    { key: "pi", label: "Price improved", num: true, get: (r) => r.pi, fmt: (v: number | null) => pct(v, 1) },
    { key: "aq", label: "At or better than quote", num: true, get: (r) => r.aq, fmt: (v: number | null) => pct(v, 1) },
    { key: "sz", label: "Avg order", num: true, get: (r) => r.sz, fmt: (v: number | null) => (v == null ? "–" : `$${num(v)}`) },
    { key: "t", label: "Avg time (ms)", num: true, get: (r) => r.t, fmt: (v: number | null) => num(v, 0) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-24 pt-8">
      <div><h1 className="text-[28px] font-semibold tracking-tight text-ink">Explore brokers</h1>
        <p className="mt-1 text-[14.5px] text-ink2">Every broker's payment and execution quality under the filters below. Click a broker for its detail page.</p></div>
      <FilterBar d={d} f={f} set={set} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Brokers compared" value={both.length} note={`with both reports · ${rows.length} with fill data`} />
        <Tile label="Paid vs customer cost" value={rho == null ? "–" : signed(rho, 2)} note={rho == null ? "too few brokers" : `${strength(rho)} rank correlation (0 = none, 1 = perfect)`} />
        <Tile label="Median customer pays" value={pct(median(rows.map((r) => r.cust!)))} note="of the quoted spread" />
        <Tile label="Most paid for order flow" value={topPay?.name ?? "–"} note={topPay ? `${pct(topPay.payPct, 1)} of spread · customers pay ${pct(topPay.cust)}` : ""} />
      </div>
      <Card title="What the broker is paid vs. what the customer pays"
        sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${BUCKET_LABEL[f.b].toLowerCase()} · fills ${f.month.slice(0, 4)}-${f.month.slice(4)} · payments ${quarterLong(f.quarter)}`}
        right={<>
          <Segmented size="sm" value={view} onChange={setView} options={[["bars", "Bars"], ["scatter", "Scatter"]]} />
          {view === "bars" && <Select label="" value={sort} onChange={setSort} options={[["pay", "Most paid first"], ["cust", "Customer pays most"], ["custasc", "Customer pays least"], ["pi", "Most price-improved"], ["name", "Name"]]} />}
        </>}>
        {view === "bars" && <Legend items={[{ color: "var(--s1)", label: "Broker is paid (payment for order flow)" }, { color: "var(--s2)", label: "Customer pays (lower = better fill)" }]} />}
        {!rows.length ? <Empty>No fill data for this selection.</Empty>
          : view === "bars"
            ? <PairedBars onClick={(id) => go(`broker/${id}`)} rows={[...rows].sort(SORTS[sort]).map((r) => ({ id: r.id, label: r.name, pay: r.payPct, cost: r.cust!, tip: tip(r) }))} />
            : <Scatter xLabel="Broker is paid, % of spread →" yLabel="Customer pays, % of spread →" onClick={(id) => go(`broker/${id}`)}
                points={both.map((r) => ({ id: r.id, label: r.name, x: r.payPct!, y: r.cust!, tip: tip(r) }))} height={460} />}
        <TableTwin><SortTable name="brokers" rows={rows} cols={cols} initial={{ key: "pay", dir: "desc" }} onRow={(r) => go(`broker/${r.id}`)} /></TableTwin>
      </Card>
      <Card title="What stands out">
        <ul className="list-disc space-y-1.5 pl-5 text-[14.5px] text-ink2 [&_b]:font-semibold [&_b]:text-ink">
          {topPay && <li><b>{topPay.name}</b> is paid the most: {pct(topPay.payPct, 1)} of the spread. Its customers pay {pct(topPay.cust)}.</li>}
          {worst && <li>Customers pay the most at <b>{worst.name}</b> ({pct(worst.cust)} of the spread){worst.payPct == null ? ", which has no 606 payment data." : worst.payPct <= 1 ? `, which is paid ${pct(worst.payPct, 1)}.` : "."}</li>}
          {best && <li>Best fills: <b>{best.name}</b> ({pct(best.cust)} of the spread{best.cust! < 0 ? ", better than the midpoint" : ""}).</li>}
          {unpaidBad.length > 0 && <li>Paid ≤1% of the spread, yet customers pay ≥40%: {unpaidBad.map((r) => <b key={r.id}>{r.name} </b>)}. Payment alone doesn't explain poor fills.</li>}
          {no606.length > 0 && <li>No 606 payment data for {quarterLong(f.quarter)}: {no606.map((r) => r.name).join(", ")}.</li>}
        </ul>
      </Card>
    </div>
  );
}
