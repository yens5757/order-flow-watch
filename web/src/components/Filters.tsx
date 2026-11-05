// One row of filters, pinned to the top of the window while the charts scroll (from tablet width up; on a phone it
// scrolls away with the page, so it never takes a third of the screen).
import { BUCKETS, type Data, type Filters, type Ot, type Sp } from "../lib/data";
import { monthLong, quarterLong } from "../lib/format";
import { Info, Segmented, Select, Switch } from "./ui";

type Key = "sp" | "ot" | "b" | "month" | "quarter" | "clearing";

export function FilterBar({ d, f, set, show }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; show: Key[] }) {
  return (
    <div className="z-30 -mx-4 mb-6 border-b border-line bg-[color-mix(in_srgb,var(--page)_88%,transparent)] px-4 py-3 backdrop-blur sm:sticky sm:top-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {show.includes("sp") && <Segmented<Sp> label="Stocks" value={f.sp} onChange={(sp) => set({ sp })} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />}
        {show.includes("ot") && (
          <span className="inline-flex items-center gap-1.5">
            <Segmented<Ot> label="Order type" value={f.ot} onChange={(ot) => set({ ot })} options={[["M", "Market orders"], ["ML", "Marketable limit"]]} />
            <Info>Market orders fill at once; marketable limit orders add a price cap.</Info>
          </span>
        )}
        {show.includes("b") && <Select<number> label="Order size" value={f.b} onChange={(b) => set({ b })} options={BUCKETS} />}
        {show.includes("month") && d.meta.months.length > 1 &&
          <Select label="Prices from" value={f.month} onChange={(month) => set({ month })} options={d.meta.months.map((m) => [m, monthLong(m)])} />}
        {show.includes("quarter") &&
          <Select label="Payments from" value={f.quarter} onChange={(quarter) => set({ quarter })} options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)])} />}
        {show.includes("clearing") && (
          <span className="inline-flex items-center gap-1.5">
            <Switch label="Show Apex Clearing" checked={f.clearing} onChange={(clearing) => set({ clearing })} />
            <Info>Apex routes orders for several brokers; you can't open an account there.</Info>
          </span>
        )}
      </div>
    </div>
  );
}
