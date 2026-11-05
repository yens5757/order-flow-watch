// The explorer's controls, the same pieces in two layouts. On a desktop: two rows of labelled controls on the page ground
// over the chart (what to show and which brokers; then which orders), the Brokers button opening the broker chips in
// place. On phones and tablets: one column in the bottom sheet behind "Change view".
// Standard controls only: native selects that only report the pick (the measure lists come in two groups), the pill
// switch for two- and three-way choices (one Tab stop, arrow keys pick), checkboxes drawn as chips for the brokers, and
// the shared toggles. Every pick applies at once; the page writes it into the link.
import { useId, useState, type ReactNode } from "react";
import { BUCKETS, type Data, type Metric, type Ot, type Sp } from "../../lib/data";
import { quarterLong } from "../../lib/format";
import type { MetricKey } from "../../lib/metrics";
import { Icon, Info, Segmented, Select, Switch } from "../ui";
import { measureGroups, type View } from "./view";
import { Sheet } from "./Sheet";

export interface ControlProps {
  d: Data; s: View; set: (p: Partial<View>) => void; reset: () => void; changed: boolean;
  /** brokers with a price for these orders (Apex too when it is switched on) */
  all: Metric[];
  /** those the "only brokers paid for orders" switch leaves, the chips' list */
  pool: Metric[];
  /** how many brokers are picked */
  shown: number;
  noData: (k: MetricKey) => boolean;
}

/** A native select in the shared pill look (ui.css .sel), its options in labelled groups. */
function GroupSelect({ label, value, onChange, groups, first }: {
  label: string; value: string; onChange: (v: string) => void; groups: [string, [string, string][]][]; first?: [string, string];
}) {
  return (
    <label className="sel ex-gsel">
      <span className="sel-l">{label}</span>
      <span className="sel-box">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {first && <option value={first[0]}>{first[1]}</option>}
          {groups.map(([title, opts]) => (
            <optgroup key={title} label={title}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </optgroup>
          ))}
        </select>
        <Icon name="down" size={20} className="sel-i" />
      </span>
    </label>
  );
}

/** A labelled field whose control names itself (a pill switch's aria-label): the visible word is for the eye only. */
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="ex-f"><span className="ex-l" aria-hidden="true">{label}</span>{children}</div>
);

/** Which brokers the chart and table show: a chip per broker (a checkbox: checked = shown), all or none at once, and
 *  the two switches that change the list itself. */
function Brokers({ s, set, pool }: Pick<ControlProps, "s" | "set" | "pool">) {
  const byName = [...pool].sort((a, b) => a.f.short.localeCompare(b.f.short));
  const on = pool.filter((r) => !s.ex.includes(r.id)).length;
  return (
    <div className="ex-brokers">
      <fieldset className="ex-chipset">
        <legend className="ex-legend">Brokers shown <span className="ex-count">{on} of {pool.length}</span></legend>
        {/* never disabled: a pressed button that disabled itself would drop keyboard focus */}
        <div className="ex-chip-acts">
          <button type="button" className="ex-act" onClick={() => set({ ex: [] })}>Select all</button>
          <button type="button" className="ex-act" onClick={() => set({ ex: pool.map((r) => r.id) })}>Clear</button>
        </div>
        <div className="ex-chips">
          {byName.map((r) => {
            const shown = !s.ex.includes(r.id);
            return (
              <label key={r.id} className="ex-chip">
                <input type="checkbox" checked={shown}
                  onChange={() => set({ ex: shown ? [...s.ex, r.id] : s.ex.filter((x) => x !== r.id) })} />
                <span>{shown && <Icon name="check" size={16} />}{r.f.short}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="ex-switches">
        <Switch label="Only brokers paid for orders" checked={s.paid} onChange={(paid) => set({ paid })} />
        <span className="ex-with">
          <Switch label="Show Apex Clearing" checked={s.clr} onChange={(clr) => set({ clr })} />
          <Info topic="Apex Clearing">Apex routes orders for several brokers; you can't open an account there.</Info>
        </span>
      </div>
    </div>
  );
}

/** The pieces both layouts share. */
function parts({ d, s, set, noData }: ControlProps) {
  return {
    measure: (
      <GroupSelect label="Measure" value={s.m} onChange={(m) => set({ m: m as MetricKey })} groups={measureGroups(d, noData)} />
    ),
    versus: (
      <GroupSelect label="Compare with" value={s.vs} onChange={(vs) => set({ vs: vs as MetricKey | "" })}
        first={["", "Nothing (rank the brokers)"]} groups={measureGroups(d, noData, s.m)} />
    ),
    stocks: (
      <Field label="Stocks">
        <Segmented<Sp> label="Stocks" value={s.sp} onChange={(sp) => set({ sp })} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} />
      </Field>
    ),
    orderType: (
      <Field label="Order type">
        <span className="ex-with">
          <Segmented<Ot> label="Order type" value={s.ot} onChange={(ot) => set({ ot })} options={[["M", "Market"], ["ML", "Marketable limit"]]} />
          <Info topic="order types">Market orders fill at once; marketable limit orders add a price cap.</Info>
        </span>
      </Field>
    ),
    size: <Select<number> label="Order size" value={s.b} onChange={(b) => set({ b })} options={BUCKETS} />,
    quarter: (
      <Select label="Payments from" value={s.q} onChange={(q) => set({ q })}
        options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)] as [string, string])} />
    ),
  };
}

/** Desktop: the controls in two rows on the ground, over what they change. */
export function ControlBar(p: ControlProps) {
  const [open, setOpen] = useState(false);
  const hid = useId(), pid = useId();
  const { measure, versus, stocks, orderType, size, quarter } = parts(p);
  const total = p.all.length;
  const picked = p.shown === total ? `All ${total}` : `${p.shown} of ${total}`;
  return (
    // js-only: without a script the page is the pre-rendered default view, and controls that could do nothing are hidden
    <section className="ex-ctl ex-bar js-only" aria-labelledby={hid}>
      <h2 id={hid} className="sr-only">Measure and filters</h2>
      <div className="ex-row">
        {measure}
        {versus}
        <Field label="Brokers">
          <button type="button" className="ex-pick" aria-expanded={open} aria-controls={pid} onClick={() => setOpen(!open)}>
            <span><span className="sr-only">Brokers: </span>{picked}</span><Icon name="down" size={20} />
          </button>
        </Field>
      </div>
      <div id={pid} className="card ex-panel" hidden={!open}>
        <Brokers s={p.s} set={p.set} pool={p.pool} />
      </div>
      <div className="ex-row">
        {stocks}
        {orderType}
        {size}
        {quarter}
        {p.changed && <button type="button" className="btn btn-ghost ex-reset" onClick={p.reset}>Reset view</button>}
      </div>
    </section>
  );
}

/** Phones and tablets: every control in one column in the bottom sheet; its footer button shows the result. */
export function ControlSheet(p: ControlProps & { open: boolean; onClose: () => void; count: number }) {
  const { measure, versus, stocks, orderType, size, quarter } = parts(p);
  const result = p.count ? `Show ${p.count} broker${p.count === 1 ? "" : "s"}` : "Close";
  return (
    <Sheet open={p.open} onClose={p.onClose} title="Measure and filters"
      foot={<>
        {p.changed && <button type="button" className="btn btn-ghost" onClick={p.reset}>Reset</button>}
        <button type="button" className="btn btn-solid ex-done" onClick={p.onClose}>{result}</button>
      </>}>
      <div className="ex-ctl ex-stack">
        {measure}
        {versus}
        {stocks}
        {orderType}
        {size}
        {quarter}
        <Brokers s={p.s} set={p.set} pool={p.pool} />
      </div>
      <p className="sr-only" role="status">{p.count === 1 ? "1 broker" : `${p.count} brokers`} in the chart</p>
    </Sheet>
  );
}
