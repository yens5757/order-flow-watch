// One row of filters, pinned under the header while the charts scroll.
import { BUCKETS, type Data, type Filters, type Ot, type Sp } from "../lib/data";
import { monthLong, quarterLong } from "../lib/format";
import { Segmented, Select, Switch } from "./ui";

type Key = "sp" | "ot" | "b" | "month" | "quarter" | "clearing";

export function FilterBar({ d, f, set, show }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; show: Key[] }) {
  return (
    <div className="sticky top-[60px] z-30 -mx-4 mb-6 border-b border-line bg-[color-mix(in_srgb,var(--page)_88%,transparent)] px-4 py-3 backdrop-blur sm:top-[64px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {show.includes("sp") && <Segmented<Sp> value={f.sp} onChange={(sp) => set({ sp })} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />}
        {show.includes("ot") && <Segmented<Ot> value={f.ot} onChange={(ot) => set({ ot })} options={[["M", "Market orders"], ["ML", "Marketable limit"]]} />}
        {show.includes("b") && <Select<number> label="Order size" value={f.b} onChange={(b) => set({ b })} options={BUCKETS} />}
        {show.includes("month") && d.meta.months.length > 1 &&
          <Select label="Fills" value={f.month} onChange={(month) => set({ month })} options={d.meta.months.map((m) => [m, monthLong(m)])} />}
        {show.includes("quarter") &&
          <Select label="Payments" value={f.quarter} onChange={(quarter) => set({ quarter })} options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)])} />}
        {show.includes("clearing") && <Switch label="Include clearing firm (Apex)" checked={f.clearing} onChange={(clearing) => set({ clearing })} />}
      </div>
    </div>
  );
}
