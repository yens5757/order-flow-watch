import { useMemo } from "react";
import { EChart } from "../charts/EChart";
import { hBars, labeledScatter, pairedBars } from "../charts/options";
import { DataTable, type Col } from "../components/DataTable";
import { FilterBar } from "../components/Filters";
import { Card, Empty, PageHeader } from "../components/ui";
import { brokerRows, BUCKET_LABEL, OT_LABEL, SP_LABEL, type Data, type Filters, type Metric } from "../lib/data";
import { cents, num, pct, quarterLong, signed, usd2 } from "../lib/format";
import { go } from "../lib/hooks";
import { useTheme } from "../lib/theme";

export default function Brokers({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const { t } = useTheme();
  const rows = useMemo(() => brokerRows(d, f).sort((a, b) => a.cust! - b.cust!), [d, f]);
  const gap = (id: string) => d.sameStock.brokers.find((g) => g.id === id && g.sp === f.sp)?.gap ?? null;
  const open = (p: { data?: { id?: string } }) => p.data?.id && go(`broker/${p.data.id}`);
  const scope = `${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${BUCKET_LABEL[f.b].toLowerCase()}`;

  const paired = useMemo(() => pairedBars(t, rows.map((r) => ({ id: r.id, name: r.f.short, a: r.payPct, b: r.cust })),
    { aName: "Broker is paid", bName: "Customer pays", fmt: (v) => `${v.toFixed(0)}%` }), [t, rows]);

  const costRows = rows.filter((r) => r.cost10k != null).sort((a, b) => a.cost10k! - b.cost10k!);
  const cost = useMemo(() => hBars(t, costRows.map((r) => ({
    id: r.id, name: r.f.short, v: r.cost10k!,
    rows: [[t.s[1], "Extra cost vs the midpoint", usd2(r.cost10k)], [null, "Customer pays", pct(r.cust, 1) + " of the spread"], [null, "Typical spread", r.qsBps == null ? "–" : `${r.qsBps.toFixed(1)} bps`]],
  })), { fmt: usd2, color: t.s[1], clickable: true }), [t, costRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const piRows = rows.filter((r) => r.pi != null);
  const improved = useMemo(() => labeledScatter(t, piRows.map((r) => ({
    id: r.id, name: r.f.short, x: r.pi!, y: r.cust!,
    rows: [[null, "Orders price-improved", pct(r.pi, 0)], [t.s[1], "Customer pays", pct(r.cust, 1)]],
  })), { xName: "Orders 'price-improved' (%)", yName: "Customer pays (% of spread)", xFmt: (v) => `${v}%`, yFmt: (v) => `${v}%`, clickable: true }), [t, piRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const cols: Col<Metric>[] = [
    { key: "name", label: "Broker", value: (r) => r.f.short, render: (r) => <span className="font-medium text-ink">{r.f.short}</span> },
    { key: "cust", label: "Customer pays", num: true, value: (r) => r.cust, render: (r) => pct(r.cust, 1), hint: "Share of the quoted spread the customer paid (lower is better)" },
    { key: "pay", label: "Broker paid", num: true, value: (r) => r.payPct, render: (r) => pct(r.payPct, 1), hint: "Payment for order flow, as a share of the spread" },
    { key: "cph", label: "¢ / 100 sh", num: true, value: (r) => r.cph, render: (r) => cents(r.cph) },
    { key: "gap", label: "Same-stock gap", num: true, value: (r) => gap(r.id),
      render: (r) => { const g = gap(r.id); return <span className={g == null ? "" : g < 0 ? "text-better" : "text-worse"}>{signed(g, 1)}</span>; } },
    { key: "c10k", label: "$ per $10k", num: true, value: (r) => r.cost10k, render: (r) => usd2(r.cost10k) },
    { key: "pi", label: "Price-improved", num: true, value: (r) => r.pi, render: (r) => pct(r.pi, 0) },
    { key: "sz", label: "Avg order", num: true, value: (r) => r.sz, render: (r) => (r.sz == null ? "–" : `${num(r.sz)} sh`) },
  ];

  return (
    <div className="rise">
      <PageHeader eyebrow="Brokers" title="Who gives the best prices?"
        sub="Every broker's customer cost next to what the broker is paid, in the same unit: share of the spread." />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "b", "quarter", "clearing"]} />

      {!rows.length ? <Empty>No broker reports this combination.</Empty> : (
        <div className="space-y-5">
          <Card title="Paid vs what customers pay" sub={`${scope} · payments ${quarterLong(f.quarter)} · best prices at the top`}
            info="Both bars use the same unit, share of the quoted spread. 'Broker is paid' converts the 606 payment (cents per 100 shares) using the broker's typical price and spread.">
            <EChart option={paired} height={rows.length * 34 + 70} label="Payment and customer cost per broker" onClick={open} />
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card title="Extra cost on a $10,000 trade" sub="Dollars above the midpoint price, at each broker's typical spread">
              {costRows.length ? <EChart option={cost} height={costRows.length * 28 + 20} label="Dollar cost per $10,000 trade" onClick={open} /> : <Empty>No spread data.</Empty>}
            </Card>
            <Card title="“Price improved” can mislead" sub="Brokers advertise this rate. It barely tracks what customers actually pay."
              info="An order counts as 'price-improved' if it beats the quoted price by any amount, even a fraction of a cent. Webull improves 94% of orders and still charges about half the spread.">
              {piRows.length ? <EChart option={improved} height={Math.max(320, costRows.length * 28 + 20)} label="Price-improvement rate against customer cost" onClick={open} /> : <Empty>No data.</Empty>}
            </Card>
          </div>

          <Card title="All brokers" sub="Click a row for the full profile · sort by any column">
            <DataTable rows={rows} cols={cols} initial={{ key: "cust", dir: 1 }} onRow={(r) => go(`broker/${r.id}`)}
              search={(r) => `${r.f.short} ${r.f.name}`} file={`brokers_${f.month}_${f.sp}_${f.ot}.csv`} />
          </Card>
        </div>
      )}
    </div>
  );
}
