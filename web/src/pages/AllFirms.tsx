import { useMemo, useState } from "react";
import { EChart } from "../charts/EChart";
import { strip } from "../charts/options";
import { DataTable, type Col } from "../components/DataTable";
import { FilterBar } from "../components/Filters";
import { Card, Legend, PageHeader, Segmented } from "../components/ui";
import { BUCKET_LABEL, execKey, OT_LABEL, slugOf, SP_LABEL, type Data, type Filters } from "../lib/data";
import { num, pct, titleCase } from "../lib/format";
import { go } from "../lib/hooks";
import { brokerPath, href } from "../lib/routes";
import { useTheme } from "../lib/theme";

/** Firm groups: [chart row label, toggle label, chart row label on phones (line breaks keep them narrow so the plot keeps its width)]. */
const GROUPS: [string, string, string][] = [
  ["Brokers on this site", "On this site", "Brokers on\nthis site"],
  ["Other brokers", "Other brokers", "Other brokers"],
  ["Trading firms", "Trading firms", "Trading firms"],
  ["Exchanges and\nother trading venues", "Exchanges & venues", "Exchanges &\nvenues"],
];
/** The chart shows customers paying between these shares of the spread; firms outside stay in the table and are named in the card foot. */
const LO = -50, HI = 250;
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
  const inRange = (r: R) => r.cust != null && r.cust > LO && r.cust < HI;
  const plotted = data.filter(inRange);
  const cut = data.filter((r) => r.cust != null && !inRange(r));
  const chart = useMemo(() => strip(t, GROUPS.map(([g]) => g), plotted.map((r) => ({
    id: r.id, name: r.name, g: r.g, x: r.cust!, hl: r.tracked,
    rows: [[null, "Customer pays", pct(r.cust, 1) + " of the spread"], [null, "Price-improved", pct(r.pi, 0)], [null, "Category", r.cat]],
  })), {
    xName: "Customer pays (% of the spread) · lower is better", fmt: (v) => `${v}%`,
    narrow: { groups: GROUPS.map(([, , g]) => g), xName: "% of the spread paid · lower is better" },
  }), [t, plotted]);
  const shown = group < 0 ? data : data.filter((r) => r.g === group);

  const cols: Col<R>[] = [
    { key: "name", label: "Firm", pin: true, value: (r) => r.name, render: (r) => <span className={r.tracked ? "font-medium text-ink" : ""}>{r.name}</span> },
    { key: "cat", label: "Category", value: (r) => r.cat },
    { key: "cust", label: "Customer pays", num: true, hint: "Share of the quoted spread the customer paid; lower is better", value: (r) => r.cust, render: (r) => pct(r.cust, 1) },
    { key: "pi", label: "Price-improved", num: true, hint: "Share filled at a better price than the quote", value: (r) => r.pi, render: (r) => pct(r.pi, 0) },
    { key: "sz", label: "Average order", num: true, hint: "Average order size in dollars", value: (r) => r.sz, render: (r) => (r.sz == null ? "–" : `$${num(r.sz)}`) },
  ];

  return (
    <div className="rise">
      <PageHeader title="Every firm that reports how well it fills orders"
        intro={`${data.length} firms file a monthly price report (SEC Rule 605).`} />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "b", "month"]} />
      <div className="space-y-5">
        <Card title="Where the brokers on this site sit among every firm" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${BUCKET_LABEL[f.b].toLowerCase()}`}
          right={<Legend items={[{ color: t.s[0], label: "Broker on this site" }, { color: t.context, label: "Other firm" }]} />}
          foot={<>Left off the chart: firms whose customers pay under −50% or over 250% of the spread ({cut.length === 0 ? "none this month" : cut.length > 5 ? `${cut.length} firms this month` : `this month: ${cut.map((r) => r.name).join(", ")}`}); they stay in the table below.</>}>
          <EChart option={chart} height={360} label="Customer pays, by firm group"
            onClick={(p) => p.data?.hl && go(brokerPath(slugOf(d, p.data.id)))} />
        </Card>
        <Card title="All firms" right={<Segmented size="sm" label="Firm group" value={group} onChange={setGroup} options={[[-1, "All"], ...GROUPS.map(([, p], i) => [i, p] as [number, string])]} />}>
          <DataTable rows={shown} cols={cols} initial={{ key: "cust", dir: 1 }} search={(r) => `${r.name} ${r.id} ${r.cat}`}
            rowHref={(r) => (r.tracked ? href(brokerPath(slugOf(d, r.id))) : null)} file={`rule605_reporters_${f.month}.csv`} maxHeight={560} />
        </Card>
      </div>
    </div>
  );
}
