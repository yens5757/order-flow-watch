// Annual-cost estimator: a few inputs in, every broker's yearly cost out. `compact` is the home-page version;
// the full one with every input exposed lives on calculator/. Pass `value`/`onChange` to own the inputs (the
// calculator page does, to keep them in the URL) and `broker`/`onBroker` to own the visitor's broker (Home's picker,
// the calculator's ?b=); otherwise both live here and are remembered in localStorage.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EChart, type Option } from "../charts/EChart";
import { base, catAxis, legend, tip, tooltip, valueAxis } from "../charts/kit";
import { annualCost, DEFAULT_INPUTS, nobodyHas, PARTS, type CostInputs, type CostLine } from "../lib/cost";
import type { Data } from "../lib/data";
import { dayLong, monthLong, num, usd2 } from "../lib/format";
import { useBrowserLayoutEffect } from "../lib/hooks";
import { href, pagePath } from "../lib/routes";
import { useTheme, type Tokens } from "../lib/theme";
import { DataTable, type Col } from "./DataTable";
import { Card, ChartTable, Empty, Icon, Info, Segmented, Select } from "./ui";

const MIX: [number, string][] = [[100, "Big companies"], [50, "A mix"], [0, "Other stocks"]];
const STORE = "calc"; // localStorage: the visitor's inputs, shared by the home-page widget and the calculator page
const BROKER = "broker"; // localStorage: the visitor's broker, the same key the home-page picker uses

/** Yearly dollars: cents under $10 ($3.40), whole dollars with commas from there (−$1,250). */
export const perYear = (v: number) => (Math.abs(v) < 10 ? usd2(v) : `${v < 0 ? "−" : ""}$${num(Math.abs(v), 0)}`);
/** "cost about $12" or, when the prices beat the fair price, "leave you about $3 ahead" */
const phrase = (v: number) => (v < -0.005 ? `leave you about ${perYear(-v)} ahead` : `cost about ${perYear(v)}`);
/** "a", "a and b", "a, b and c" */
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Saved inputs over the defaults; anything odd in storage falls back to the default for that field. */
export function loadInputs(): CostInputs {
  const out = { ...DEFAULT_INPUTS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<CostInputs> | null;
    if (raw) for (const k of Object.keys(out) as (keyof CostInputs)[]) { const v = Number(raw[k]); if (Number.isFinite(v) && v >= 0) out[k] = v; }
  } catch { /* private mode or bad JSON: defaults */ }
  out.spMix = Math.min(100, out.spMix);
  return out;
}
export function saveInputs(i: CostInputs) { try { localStorage.setItem(STORE, JSON.stringify(i)); } catch { /* private mode: the inputs just won't persist */ } }
export const loadBroker = () => { try { return localStorage.getItem(BROKER) ?? "HOOD"; } catch { return "HOOD"; } };
export const saveBroker = (id: string) => { try { localStorage.setItem(BROKER, id); } catch { /* private mode */ } };

/* ---------- ranked horizontal stacked bars, one per broker, the five parts as segments ---------- */
function stackedBars(t: Tokens, rows: CostLine[], hl: string | undefined): Option {
  const names = rows.map((r) => r.short);
  // the " *" flags a gap other brokers don't have; a fact missing for every broker is noted once under the chart instead
  const flagged = (r: CostLine) => r.gaps.length > 0;
  // the outermost non-zero segment on each side gets the rounded data-end
  const edge = (r: CostLine, sign: 1 | -1) => { let k = -1; PARTS.forEach((p, i) => { if (r[p.key] * sign > 0) k = i; }); return k; };
  // the total label sits right of the stack's positive end. For a negative total it goes on the outermost negative part,
  // whose right end is the zero line, so it sits in that row's empty right half (a zero-value part would stack onto the
  // negative side and put the label on top of the bar; "left" would run into the broker names on a phone)
  const labelOn = (r: CostLine) => { const k = edge(r, r.total < 0 ? -1 : 1); return k < 0 ? PARTS.length - 1 : k; };
  const hlName = rows.find((r) => r.id === hl)?.short;
  const value = (r: CostLine, p: (typeof PARTS)[number]) => (r[p.key] !== 0 ? perYear(r[p.key]) : p.facts.some((f) => r.missing.includes(f)) ? "not available" : "$0");
  // a few small negatives (prices better than the fair price) get a little room on the left, not a whole tick
  const lo = Math.min(0, ...rows.map((r) => PARTS.reduce((a, p) => a + Math.min(0, r[p.key]), 0)));
  const min = lo < 0 ? lo * 1.25 : 0;
  return {
    ...base(t),
    legend: legend(t, { data: PARTS.map((p) => p.label) }),
    grid: { left: 8, right: 64, top: 38, bottom: 22, containLabel: true },
    xAxis: valueAxis(t, { min, splitNumber: 4, axisLabel: { color: t.muted, formatter: (v: number) => perYear(v), hideOverlap: true, showMinLabel: min === 0 } }),
    yAxis: catAxis(t, names, {
      inverse: true, axisLine: { show: false },
      axisLabel: { color: t.ink2, fontSize: 12, rich: { hl: { color: t.ink, fontWeight: 700, fontSize: 12 }, m: { color: t.muted, fontSize: 12 } },
        formatter: (v: string, i: number) => `${v === hlName ? `{hl|${v}}` : v}${rows[i] && flagged(rows[i]) ? "{m| *}" : ""}` },
    }),
    tooltip: tooltip(t, {
      trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.neutral, opacity: 0.25 } },
      formatter: (ps: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const r = rows[ps[0].dataIndex];
        return tip(r.name, [...PARTS.map((p) => [t.s[p.slot], p.label, value(r, p)] as [string, string, string]), [null, "Total per year", perYear(r.total)]],
          r.missing.length ? `Not available: ${r.missing.join(", ")}` : undefined);
      },
    }),
    // the colour sits on the series, so the legend swatches match the bars
    series: PARTS.map((p, i) => ({
      name: p.label, type: "bar", stack: "all", barWidth: 13, barCategoryGap: "35%",
      itemStyle: { color: t.s[p.slot], borderColor: t.surface, borderWidth: 1 },
      data: rows.map((r) => ({
        value: r[p.key], id: r.id,
        itemStyle: { borderRadius: i === edge(r, 1) ? [0, 4, 4, 0] : i === edge(r, -1) ? [4, 0, 0, 4] : 0 },
        label: i === labelOn(r) ? { show: true, position: "right" } : { show: false },
      })),
      label: { color: t.ink2, fontSize: 11.5, formatter: (q: any) => perYear(rows[q.dataIndex].total) }, // eslint-disable-line @typescript-eslint/no-explicit-any
      emphasis: { focus: "series" },
      cursor: "pointer",
      markArea: i === 0 && hlName ? { silent: true, itemStyle: { color: t.accent, opacity: 0.1 }, data: [[{ yAxis: hlName }, { yAxis: hlName }]] } : undefined,
    })),
  };
}

/* ---------- a labelled number box; keeps what is typed until it parses ---------- */
function Num({ label, value, onChange, step, prefix, hint }: { label: string; value: number; onChange: (v: number) => void; step: number; prefix?: string; hint?: string }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt((s) => (Number(s) === value ? s : String(value))); }, [value]);
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12.5px] font-medium text-muted">{label}</span>
      <span className="flex items-center gap-1 rounded-xl border border-line bg-surface2 px-3 focus-within:border-accent">
        {prefix && <span className="text-[14px] text-muted">{prefix}</span>}
        <input type="number" inputMode="numeric" min={0} step={step} value={txt} aria-label={label}
          onChange={(e) => { setTxt(e.target.value); const v = e.target.valueAsNumber; if (Number.isFinite(v) && v >= 0) onChange(v); }}
          onBlur={() => setTxt(String(value))}
          className="tnum w-full min-w-0 bg-transparent py-2 text-[14px] font-medium text-ink outline-none" />
      </span>
      {hint && <span className="mt-1 block text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}

export default function Estimator({ d, compact, value, onChange, broker, onBroker }: {
  d: Data; compact?: boolean; value?: CostInputs; onChange?: (i: CostInputs) => void; broker?: string; onBroker?: (id: string) => void;
}) {
  const { t } = useTheme();
  // what the visitor last typed and picked comes from the browser in an effect, never while rendering (this also renders on the server)
  const [own, setOwn] = useState<CostInputs>(DEFAULT_INPUTS);
  const [ownPick, setOwnPick] = useState("HOOD");
  useBrowserLayoutEffect(() => { if (!value) setOwn(loadInputs()); if (!broker) setOwnPick(loadBroker()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const inp = value ?? own;
  const set = (p: Partial<CostInputs>) => { const next = { ...inp, ...p }; saveInputs(next); if (onChange) onChange(next); else setOwn(next); };
  const pick = broker ?? ownPick;
  const choose = (id: string) => { saveBroker(id); if (onBroker) onBroker(id); else setOwnPick(id); };

  // one order everywhere (chart, "#" column, cheapest, rank): complete estimates first, cheapest first within each group
  const lines = useMemo(() => annualCost(d, inp), [d, inp]);
  const me = lines.find((l) => l.id === pick);
  const cheapest = lines[0], priciest = lines[lines.length - 1];
  const rank = me ? lines.indexOf(me) + 1 : null;
  // the home page shows the five cheapest plus the visitor's own broker
  const top = lines.slice(0, 5);
  const shown = compact ? [...top, ...(me && !top.includes(me) ? [me] : [])] : lines;
  // a fact nobody has verified yet (today: interest on idle cash) is left out everywhere, so it changes no ranking and is
  // reported once; a line's `gaps` is what it lacks that others have, which is what the asterisks, chips and sentence flag
  const nobody = nobodyHas(lines);
  const incomplete = shown.filter((l) => l.gaps.length).length;
  const chart = useMemo(() => stackedBars(t, shown, me?.id), [t, shown, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Fidelity's commission is not available, so its figure is incomplete", for the visitor's broker and the one named cheapest
  const caveat = (l: CostLine) => (l.gaps.length ? <span className="text-muted"> {l.short}'s {list(l.gaps)} {l.gaps.length > 1 ? "are" : "is"} not available, so its figure is incomplete.</span> : null);
  let summary: ReactNode = null;
  if (me && cheapest && me !== cheapest) summary = <>At <b>{me.short}</b> this would {phrase(me.total)} a year; at <b>{cheapest.short}</b> it would {phrase(cheapest.total)}.{caveat(me)}{caveat(cheapest)}</>;
  else if (me && priciest) summary = <>At <b>{me.short}</b> this would {phrase(me.total)} a year, the lowest of {lines.length} brokers; at <b>{priciest.short}</b> it would {phrase(priciest.total)}.{caveat(me)}</>;
  else if (cheapest && priciest) summary = <>At <b>{cheapest.short}</b> this would {phrase(cheapest.total)} a year; at <b>{priciest.short}</b> it would {phrase(priciest.total)}.{caveat(cheapest)}</>;

  const checked = d.meta.feesChecked ? `checked ${dayLong(d.meta.feesChecked)}` : "not yet checked";
  const foot = (
    <>Prices: how far from the fair price each broker's customers' market orders were filled, for orders of your size, from the official SEC Rule 605 reports for {monthLong(d.meta.month)}. Fees: each broker's own price list, {checked}.
      {" "}Estimates, not advice: fees change, and your own trades will differ.</>
  );
  const brokerPick = <Select label="Your broker" value={me?.id ?? ""} onChange={choose} options={[...lines].sort((a, b) => a.short.localeCompare(b.short)).map((l) => [l.id, l.short])} />;
  const mixInfo = <Info>Big companies = stocks in the S&P 500. Other stocks = anything else, including ETFs. "A mix" counts half of each.</Info>;
  const asTable = (rows: CostLine[]) => (
    <ChartTable head={["Broker", "Total per year", ...PARTS.map((p) => p.label)]}
      rows={rows.map((r) => [r.short + (r.gaps.length ? " *" : ""), perYear(r.total), ...PARTS.map((p) => (r[p.key] === 0 && p.facts.some((f) => r.missing.includes(f)) ? "–" : perYear(r[p.key])))])} />
  );

  const mainInputs = (
    <>
      <Num label="Trades per year" value={inp.trades} onChange={(trades) => set({ trades })} step={1} />
      <Num label="Typical trade size" value={inp.size} onChange={(size) => set({ size })} step={100} prefix="$" />
      {/* two columns wide: the three-way control needs the room, and the grids below are sized for it */}
      <div className="col-span-2 min-w-0">
        <span className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-muted">What you trade{mixInfo}</span>
        <Segmented<number> label="What you trade" value={inp.spMix} onChange={(spMix) => set({ spMix })} options={MIX} />
      </div>
    </>
  );

  if (compact) {
    return (
      <Card title="Your yearly estimate" sub="Trade prices plus fees. Change the numbers to match how you trade." right={brokerPick} foot={foot}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{mainInputs}</div>
        {shown.length ? (
          <>
            <p className="mt-5 text-[15px] leading-relaxed text-ink2">{summary}</p>
            <EChart option={chart} height={shown.length * 28 + 60} label="Yearly cost at the cheapest brokers and yours" onClick={(p) => { if (p.data?.id) choose(p.data.id); }} />
            {asTable(shown)}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
              <span>{[incomplete ? "* some fees not available, so the bar is incomplete" : "", nobody.length ? `${nobody.join(", ")}: not verified for any broker yet, so left out everywhere` : ""].filter(Boolean).join(" · ")}</span>
              <a href={href(pagePath("calculator"))} className="-my-2.5 inline-flex items-center gap-1.5 py-2.5 font-semibold text-accent transition-all hover:gap-2.5">All {lines.length} brokers, options, cash and margin<Icon name="arrow" size={15} /></a>
            </div>
          </>
        ) : <Empty>No broker has price data for this trade size yet.</Empty>}
      </Card>
    );
  }

  const cols: Col<CostLine>[] = [
    { key: "rank", label: "#", value: (r) => lines.indexOf(r) + 1, num: true, hint: "Complete estimates first, then cheapest first" },
    { key: "name", label: "Broker", pin: true, value: (r) => r.short, render: (r) => (
      <span className="inline-flex items-center gap-2">
        <span className={r.id === me?.id ? "font-bold text-ink" : "font-medium text-ink"}>{r.short}</span>
        {r.id === me?.id && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-accent">you</span>}
      </span>
    ) },
    { key: "total", label: "Total / year", value: (r) => r.total, num: true, render: (r) => <b>{perYear(r.total)}</b> },
    ...PARTS.map((p): Col<CostLine> => ({ key: p.key, label: p.label, num: true, value: (r) => r[p.key],
      render: (r) => (r[p.key] === 0 && p.facts.some((f) => r.missing.includes(f)) ? <span className="text-muted">–</span> : perYear(r[p.key])) })),
    { key: "missing", label: "Not available", wrap: true, value: (r) => r.gaps.join(", ") || null, render: (r) => (r.gaps.length
      ? <span className="inline-block max-w-[220px] rounded-xl border border-line bg-surface2 px-2 py-0.5 text-[11.5px] leading-snug text-muted">{r.gaps.join(", ")}</span>
      : <span className="text-muted">–</span>) },
  ];
  const changed = JSON.stringify(inp) !== JSON.stringify(DEFAULT_INPUTS);

  return (
    <div className="space-y-5">
      <Card title="How you trade" sub="Change any number; everything below updates" right={
        <div className="flex flex-wrap items-center gap-3">
          {changed && <button type="button" onClick={() => set(DEFAULT_INPUTS)} className="-mx-2 min-h-10 rounded-lg px-2 text-[13px] font-medium text-muted hover:text-ink">Reset</button>}
          {brokerPick}
        </div>
      }>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {mainInputs}
          <Num label="Options contracts per year" value={inp.options} onChange={(options) => set({ options })} step={1} hint="Fee only: price quality isn't reported" />
          <Num label="Cash sitting idle" value={inp.idleCash} onChange={(idleCash) => set({ idleCash })} step={500} prefix="$" hint="Uninvested, on a typical day" />
          <Num label="Borrowed on margin" value={inp.margin} onChange={(margin) => set({ margin })} step={500} prefix="$" hint="On a typical day" />
        </div>
      </Card>

      <Card title="What a year of this costs at each broker" sub={`${lines.length} brokers · tap a bar to make it yours`} foot={foot}>
        {shown.length ? (
          <>
            <p className="text-[15.5px] leading-relaxed text-ink2">
              {summary}{rank && me && <span className="text-muted"> {me.short} ranks #{rank} of {lines.length}{incomplete ? " (complete estimates listed first)" : ""}.</span>}
            </p>
            <EChart option={chart} height={shown.length * 28 + 60} label="Yearly cost at each broker, split by source" onClick={(p) => { if (p.data?.id) choose(p.data.id); }} />
            {incomplete > 0 && <p className="text-[12.5px] text-muted">* fees not available for part of the estimate: the bar shows only what could be worked out, and these brokers are listed after the complete ones.</p>}
            {nobody.length > 0 && <p className="mt-1 text-[12.5px] text-muted">Not verified for any broker yet: {nobody.join(", ")}. That part is left out everywhere, so it doesn't change the order.</p>}
          </>
        ) : <Empty>No broker has price data for this trade size yet.</Empty>}
      </Card>

      {lines.length > 0 && (
        <Card title="The breakdown" sub="Dollars per year, by source. Click a heading to sort; click a row to make that broker yours.">
          <DataTable rows={lines} cols={cols} initial={{ key: "rank", dir: 1 }} search={(r) => r.name + " " + r.short} file="yearly-cost-by-broker.csv" onRow={(r) => choose(r.id)} />
        </Card>
      )}
    </div>
  );
}
