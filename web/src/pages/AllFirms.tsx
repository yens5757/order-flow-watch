import { useMemo, useState } from "react";
import { Strip } from "../charts/special";
import { FilterBar } from "../components/FilterBar";
import { SortTable } from "../components/SortTable";
import { TipRow, TipTitle } from "../components/Tooltip";
import { Card, Legend } from "../components/ui";
import { BUCKET_LABEL, execKey, OT_LABEL, SP_LABEL, type Data, type Filters } from "../lib/data";
import { num, pct } from "../lib/format";
import { go } from "../lib/hooks";

const GROUPS = ["Tracked retail brokers", "Other broker-dealers", "Market makers", "Exchanges, ATSs & other"];

export default function AllFirms({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const data = useMemo(() => Object.entries(d.reporters).map(([id, r]) => {
    const e = d.exec.get(execKey(id, f.month, f.sp, f.ot, f.b));
    const g = d.byId[id] ? GROUPS[0] : r.cat === "Broker-Dealer" ? GROUPS[1] : /Market Maker/.test(r.cat) ? GROUPS[2] : GROUPS[3];
    return { id, name: d.byId[id]?.name ?? r.name, cat: r.cat, group: g, cust: e?.efq == null ? null : e.efq * 100,
      pi: e?.pi == null ? null : e.pi * 100, sz: e?.sz ?? null, t: e?.t ?? null };
  }), [d, f]);
  const shown = data.filter((r) => (group === "all" || r.group === group) && (!q || `${r.name} ${r.id}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-24 pt-8">
      <div><h1 className="text-[28px] font-semibold tracking-tight text-ink">Every Rule 605 reporter</h1>
        <p className="mt-1 text-[14.5px] text-ink2">{data.length} firms publish execution-quality reports: retail brokers, wealth managers, market makers and exchanges.</p></div>
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "b", "month"]} />
      <Card title="Where retail brokers sit among every reporter" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot].toLowerCase()} orders · ${BUCKET_LABEL[f.b].toLowerCase()} · % of the spread paid · one dot per firm`}>
        <Legend items={[{ color: "var(--s1)", label: "Tracked retail broker", kind: "dot" }, { color: "var(--context)", label: "Other firm", kind: "dot" }]} />
        <Strip groups={GROUPS} onClick={(id) => go(`broker/${id}`)} points={data.filter((r) => r.cust != null).map((r) => ({
          id: r.id, group: r.group, value: r.cust!, highlight: !!d.byId[r.id],
          tip: <><TipTitle>{r.name}</TipTitle><div className="mb-1 text-muted">{r.cat} · {r.id}</div>
            <TipRow label="Customer pays" value={pct(r.cust, 1)} /><TipRow label="Price improved" value={pct(r.pi, 1)} />
            <TipRow label="Avg order" value={r.sz == null ? "–" : `$${num(r.sz)}`} /></> }))} />
      </Card>
      <Card title="All firms" right={<>
        <div className="flex flex-wrap gap-1.5">
          {[["all", "All"], ...GROUPS.map((g) => [g, g])].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={group === v} onClick={() => setGroup(v)}
              className={`rounded-full border px-3 py-1 text-[12.5px] ${group === v ? "border-ink bg-ink text-page" : "border-line text-ink2 hover:text-ink"}`}>
              {l} <span className="opacity-60">{v === "all" ? data.length : data.filter((r) => r.group === v).length}</span>
            </button>
          ))}
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search firm or code"
          className="min-h-[34px] rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink outline-none" /></>}>
        <SortTable name="rule605-reporters" rows={shown} initial={{ key: "cust", dir: "asc" }} maxHeight={560}
          onRow={(r) => d.byId[r.id] && go(`broker/${r.id}`)} cols={[
            { key: "name", label: "Firm", get: (r) => r.name }, { key: "id", label: "Code", get: (r) => r.id }, { key: "cat", label: "Category", get: (r) => r.cat },
            { key: "cust", label: "Customer pays, % of spread", num: true, get: (r) => r.cust, fmt: (v: number | null) => pct(v, 1) },
            { key: "pi", label: "Price improved", num: true, get: (r) => r.pi, fmt: (v: number | null) => pct(v, 1) },
            { key: "sz", label: "Avg order", num: true, get: (r) => r.sz, fmt: (v: number | null) => (v == null ? "–" : `$${num(v)}`) },
            { key: "t", label: "Avg time (ms)", num: true, get: (r) => r.t, fmt: (v: number | null) => num(v, 0) }]} />
      </Card>
    </div>
  );
}
