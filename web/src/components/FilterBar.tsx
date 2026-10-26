import { BUCKETS, OT_LABEL, SP_LABEL, type Data, type Filters, type Ot, type Sp } from "../lib/data";
import { monthShort, quarterLong } from "../lib/format";
import { Field, Segmented, Select } from "./ui";

/** One filter row above everything it scopes. */
export function FilterBar({ d, f, set, show = ["sp", "ot", "b", "month", "quarter", "clearing"] }: {
  d: Data; f: Filters; set: (p: Partial<Filters>) => void; show?: (keyof Filters)[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3">
      {show.includes("sp") && <Field label="Stocks">
        <Segmented value={f.sp} onChange={(sp: Sp) => set({ sp })} options={Object.entries(SP_LABEL) as [Sp, string][]} /></Field>}
      {show.includes("ot") && <Field label="Order type">
        <Segmented value={f.ot} onChange={(ot: Ot) => set({ ot })} options={Object.entries(OT_LABEL) as [Ot, string][]} /></Field>}
      {show.includes("b") && <Select label="Order size" value={f.b} onChange={(b) => set({ b })} options={BUCKETS} />}
      {show.includes("month") && d.meta.months.length > 1 &&
        <Select label="Fills (Rule 605)" value={f.month} onChange={(month) => set({ month })} options={d.meta.months.map((m) => [m, monthShort(m)])} />}
      {show.includes("quarter") &&
        <Select label="Payments (Rule 606)" value={f.quarter} onChange={(quarter) => set({ quarter })} options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)])} />}
      {show.includes("clearing") &&
        <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[13.5px] text-ink2">
          <input type="checkbox" checked={f.clearing} onChange={(e) => set({ clearing: e.target.checked })} className="accent-[var(--s1)]" />
          Include clearing firm (Apex)
        </label>}
    </div>
  );
}
