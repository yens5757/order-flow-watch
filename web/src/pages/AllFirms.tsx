import { useMemo, useState } from "react";
import { EChart } from "../charts/EChart";
import { strip } from "../charts/options";
import { DataTable, type Col } from "../components/DataTable";
import { FilterBar } from "../components/Filters";
import { Card, Legend, PageHeader, Segmented } from "../components/ui";
import { BUCKET_LABEL, execKey, OT_LABEL, SP_LABEL, type Data, type Filters } from "../lib/data";
import { num, pct, titleCase } from "../lib/format";
import { go } from "../lib/hooks";
import { useTheme } from "../lib/theme";

const GROUPS = ["Tracked retail brokers", "Other broker-dealers", "Market makers", "Exchanges & ATSs"];
interface R { id: string; name: string; cat: string; g: number; tracked: boolean; cust: number | null; pi: number | null; sz: number | null }

export default function AllFirms({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const { t } = useTheme();
  const [group, setGroup] = useState<number>(-1);
  const data = useMemo<R[]>(() => Object.entries(d.reporters).map(([id, r]) => {
    const e = d.exec.get(execKey(id, f.month, f.sp, f.ot, f.b));
    const g = d.byId[id] ? 0 : r.cat === "Broker-Dealer" ? 1 : /Market Maker/.test(r.cat) ? 2 : 3;
    return { id, name: d.byId[id]?.short ?? titleCase(r.name), cat: r.cat, g, tracked: !!d.byId[id],
      cust: e?.efq == null ? null : e.efq * 100, pi: e?.pi == null ? null : e.pi * 100, sz: e?.sz ?? null };
  }), [d, f]);
  const plotted = data.filter((r) => r.cust != null && r.cust > -50 && r.cust < 250);
  const chart = useMemo(() => strip(t, GROUPS, plotted.map((r) => ({
    id: r.id, name: r.name, g: r.g, x: r.cust!, hl: r.tracked,
    rows: [[null, "Customer pays", pct(r.cust, 1) + " of the spread"], [null, "Price-improved", pct(r.pi, 0)], [null, "Category", r.cat]],
  })), { xName: "Customer pays (% of the spread) · lower is better", fmt: (v) => `${v}%` }), [t, plotted]);
  const shown = group < 0 ? data : data.filter((r) => r.g === group);

  const cols: Col<R>[] = [
    { key: "name", label: "Firm", value: (r) => r.name, render: (r) => <span className={r.tracked ? "font-medium text-ink" : ""}>{r.name}</span> },
    { key: "id", label: "Code", value: (r) => r.id },
    { key: "cat", label: "Category", value: (r) => r.cat },
    { key: "cust", label: "Customer pays", num: true, value: (r) => r.cust, render: (r) => pct(r.cust, 1) },
    { key: "pi", label: "Price-improved", num: true, value: (r) => r.pi, render: (r) => pct(r.pi, 0) },
    { key: "sz", label: "Avg order", num: true, value: (r) => r.sz, render: (r) => (r.sz == null ? "–" : `${num(r.sz)} sh`) },
  ];

  return (
    <div className="rise">
      <PageHeader eyebrow="All firms" title="Every Rule 605 reporter"
        sub={`${data.length} firms publish execution-quality reports: retail brokers, wealth managers, market makers and exchanges.`} />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "b", "month"]} />
      <div className="space-y-5">
        <Card title="Where retail brokers sit among everyone" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${BUCKET_LABEL[f.b].toLowerCase()} · one dot per firm`}
          right={<Legend items={[{ color: t.s[0], label: "Tracked retail broker" }, { color: t.context, label: "Other firm" }]} />}>
          <EChart option={chart} height={360} label="Customer cost of every reporting firm, grouped by type"
            onClick={(p) => p.data?.hl && go(`broker/${p.data.id}`)} />
        </Card>
        <Card title="All reporters" right={<Segmented size="sm" value={group} onChange={setGroup} options={[[-1, "All"], ...GROUPS.map((g, i) => [i, g.replace("Tracked retail brokers", "Tracked")] as [number, string])]} />}>
          <DataTable rows={shown} cols={cols} initial={{ key: "cust", dir: 1 }} search={(r) => `${r.name} ${r.id} ${r.cat}`}
            onRow={(r) => r.tracked && go(`broker/${r.id}`)} file={`rule605_reporters_${f.month}.csv`} maxHeight={560} />
        </Card>
      </div>
    </div>
  );
}
