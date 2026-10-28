// The interactive layer: pick a measure, optionally a second one to compare, filter and sort.
// Chart, summary and table all follow the same settings, which also live in the URL.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { labeledScatter, ranked } from "../charts/options";
import { DataTable, type Col } from "../components/DataTable";
import { Card, Empty, Icon, Info, PageHeader, Segmented, Select, Switch } from "../components/ui";
import { brokerRows, BUCKET_LABEL, BUCKETS, type Data, type Metric, type Ot, type Sp } from "../lib/data";
import { quarterLong, strength } from "../lib/format";
import { go, readQuery, writeQuery } from "../lib/hooks";
import { METRIC_KEYS, METRICS, type MetricKey } from "../lib/metrics";
import { median, spearman } from "../lib/stats";
import { useTheme } from "../lib/theme";

type Sort = "best" | "worst" | "az";
interface S { m: MetricKey; vs: MetricKey | ""; sp: Sp; ot: Ot; b: number; q: string; sort: Sort; ex: string[]; paid: boolean; clr: boolean }

const isKey = (v: string | null): v is MetricKey => !!v && (METRIC_KEYS as string[]).includes(v);
const defaults = (d: Data): S => ({ m: "cost10k", vs: "", sp: "Y", ot: "M", b: 199999, q: d.meta.quarter, sort: "best", ex: [], paid: false, clr: false });

function fromUrl(d: Data): S {
  const p = readQuery(), s = defaults(d);
  return {
    m: isKey(p.get("m")) ? (p.get("m") as MetricKey) : s.m,
    vs: isKey(p.get("vs")) && p.get("vs") !== p.get("m") ? (p.get("vs") as MetricKey) : "",
    sp: p.get("sp") === "N" ? "N" : "Y",
    ot: p.get("ot") === "ML" ? "ML" : "M",
    b: p.has("b") && BUCKETS.some(([b]) => b === Number(p.get("b"))) ? Number(p.get("b")) : s.b,
    q: d.meta.quarters.includes(p.get("q") ?? "") ? p.get("q")! : s.q,
    sort: (["best", "worst", "az"] as const).find((x) => x === p.get("sort")) ?? "best",
    ex: (p.get("ex") ?? "").split(",").filter(Boolean),
    paid: p.get("paid") === "1",
    clr: p.get("clr") === "1",
  };
}

function Group({ title, children, info }: { title: string; children: ReactNode; info?: ReactNode }) {
  return (
    <div className="border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">{title}{info && <Info>{info}</Info>}</div>
      {children}
    </div>
  );
}

export default function Explore({ d }: { d: Data }) {
  const { t } = useTheme();
  const [s, setS] = useState<S>(() => fromUrl(d));
  const [open, setOpen] = useState(false); // filters panel on phones
  const set = (p: Partial<S>) => setS((x) => ({ ...x, ...p, ...(p.m && p.m === x.vs ? { vs: "" as const } : {}) }));
  const def = defaults(d);

  useEffect(() => {
    writeQuery({
      m: s.m !== def.m ? s.m : null, vs: s.vs || null, sp: s.sp !== "Y" ? s.sp : null, ot: s.ot !== "M" ? s.ot : null,
      b: s.b !== def.b ? s.b : null, q: s.q !== def.q ? s.q : null, sort: s.sort !== "best" ? s.sort : null,
      ex: s.ex.length ? s.ex.join(",") : null, paid: s.paid ? 1 : null, clr: s.clr ? 1 : null,
    });
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const M = METRICS[s.m], V = s.vs ? METRICS[s.vs] : null;
  const all = useMemo(() => brokerRows(d, { sp: s.sp, ot: s.ot, b: s.b, month: d.meta.month, quarter: s.q, clearing: s.clr }), [d, s.sp, s.ot, s.b, s.q, s.clr]);
  const pool = all.filter((r) => !s.paid || (r.pay10k ?? 0) > 0.005);
  const shown = pool.filter((r) => !s.ex.includes(r.id));
  const withV = shown.filter((r) => M.get(r) != null && (!V || V.get(r) != null));

  const dir = M.better === "high" ? -1 : 1; // "best first" order; for neutral measures, high to low
  const order = (a: Metric, b: Metric) => (s.sort === "az" ? a.f.short.localeCompare(b.f.short)
    : (M.get(a)! - M.get(b)!) * (M.better ? dir : -1) * (s.sort === "worst" ? -1 : 1));
  const sorted = [...withV].sort(order);
  const med = median(withV.map((r) => M.get(r)!));
  const byVal = [...withV].sort((a, b) => M.get(a)! - M.get(b)!);
  const lo = byVal[0], hi = byVal[byVal.length - 1];
  const best = M.better === "high" ? hi : lo, worst = M.better === "high" ? lo : hi;

  const tipRows = (r: Metric): [string | null, string, string][] =>
    METRIC_KEYS.map((k) => [k === s.m || k === s.vs ? t.s[METRICS[k].slot] : null, METRICS[k].short, METRICS[k].fmt(METRICS[k].get(r))]);

  const chart = useMemo(() => (V
    ? labeledScatter(t, withV.map((r) => ({ id: r.id, name: r.f.short, x: V.get(r)!, y: M.get(r)!, rows: tipRows(r) })), {
      xName: V.label, yName: M.label, xFmt: V.axis, yFmt: M.axis, clickable: true,
      medians: [median(withV.map((r) => V.get(r)!)) ?? 0, med ?? 0],
    })
    : ranked(t, sorted.map((r) => ({ id: r.id, name: r.f.short, v: M.get(r)!, rows: tipRows(r) })), {
      fmt: (v) => M.fmt(v), axis: M.axis, color: t.s[M.slot], diverging: M.diverging, median: med, foot: "Click for the broker's full report",
    })), [t, s, all]); // eslint-disable-line react-hooks/exhaustive-deps

  // the one-sentence takeaway, rewritten for every combination
  let summary: ReactNode = null;
  if (V && withV.length >= 4) {
    const rho = spearman(withV.map((r) => V.get(r)!), withV.map((r) => M.get(r)!)) ?? 0;
    const a = Math.abs(rho), way = rho > 0 ? "higher" : "lower";
    // wording follows the strength labels in format.ts, so the sentence never claims more than the number shows
    summary = a < 0.2
      ? <>No clear pattern: a broker's <b>{V.noun}</b> tells you little about its <b>{M.noun}</b>.</>
      : a < 0.4
        ? <>At most a weak tendency: brokers with a higher <b>{V.noun}</b> have a slightly {way} <b>{M.noun}</b>, but with only {withV.length} brokers that could easily be chance.</>
        : <>Brokers with a higher <b>{V.noun}</b> tend to have a {way} <b>{M.noun}</b>.</>;
    summary = <>{summary} <span className="text-muted">Rank correlation {rho.toFixed(2)} ({strength(rho)}) across {withV.length} brokers.</span></>;
  } else if (!V && best && worst) {
    summary = M.better
      ? <><b>{best.f.short}</b> does best ({M.fmt(M.get(best))}) and <b>{worst.f.short}</b> worst ({M.fmt(M.get(worst))}). The typical broker: {M.fmt(med)}.</>
      : <>Highest: <b>{hi.f.short}</b> ({M.fmt(M.get(hi))}). Lowest: <b>{lo.f.short}</b> ({M.fmt(M.get(lo))}). The typical broker: {M.fmt(med)}.</>;
  }

  const scope = `${s.sp === "Y" ? "Big-company (S&P 500)" : "Other"} stocks · ${s.ot === "M" ? "market" : "marketable limit"} orders · ${BUCKET_LABEL[s.b].toLowerCase()} · payments ${quarterLong(s.q)}`;
  const usesGap = s.m === "gap" || s.vs === "gap";
  const sortOpts: [Sort, string][] = M.better ? [["best", "Best first"], ["worst", "Worst first"], ["az", "A–Z"]] : [["best", "High → low"], ["worst", "Low → high"], ["az", "A–Z"]];
  const changed = JSON.stringify(s) !== JSON.stringify(def);

  const cols: Col<Metric>[] = [
    { key: "name", label: "Broker", value: (r) => r.f.short, render: (r) => <span className="font-medium text-ink">{r.f.short}</span> },
    ...METRIC_KEYS.map((k): Col<Metric> => ({ key: k, label: METRICS[k].short, num: true, hint: METRICS[k].desc, value: (r) => METRICS[k].get(r), render: (r) => METRICS[k].fmt(METRICS[k].get(r)) })),
  ];

  const controls = (
    <Card>
      <Group title="Measure">
        <div className="space-y-1.5" role="radiogroup" aria-label="Measure">
          {METRIC_KEYS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={s.m === k} onClick={() => set({ m: k })}
              className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${s.m === k ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-surface2"}`}>
              <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.s[METRICS[k].slot] }} />{METRICS[k].label}
              </span>
              {s.m === k && <span className="mt-1 block text-[12.5px] leading-snug text-ink2">{METRICS[k].desc}</span>}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Compare with" info="Pick a second measure to see every broker as a dot: does one measure go with the other?">
        <Select label="Compare with" value={s.vs} onChange={(vs) => set({ vs: vs as MetricKey | "" })}
          options={[["", "Nothing (ranked list)"], ...METRIC_KEYS.filter((k) => k !== s.m).map((k) => [k, METRICS[k].label] as [string, string])]} />
      </Group>
      <Group title="Stocks"><Segmented size="sm" value={s.sp} onChange={(sp) => set({ sp })} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} /></Group>
      <Group title="Order" info="Market orders fill right away at the best available price. Marketable limit orders set a price cap but can still fill immediately.">
        <div className="space-y-2.5">
          <Segmented size="sm" value={s.ot} onChange={(ot) => set({ ot })} options={[["M", "Market"], ["ML", "Marketable limit"]]} />
          <Select label="Order size" value={s.b} onChange={(b) => set({ b })} options={BUCKETS} />
        </div>
      </Group>
      <Group title="Payments from"><Select label="Quarter" value={s.q} onChange={(q) => set({ q })} options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)])} /></Group>
      <Group title="Sort"><Segmented size="sm" value={s.sort} onChange={(sort) => set({ sort })} options={sortOpts} /></Group>
      <Group title={`Brokers (${shown.length} of ${pool.length})`}>
        <div className="mb-2.5 flex gap-3 text-[12.5px] font-semibold">
          <button type="button" className="text-accent hover:underline" onClick={() => set({ ex: [] })}>Select all</button>
          <button type="button" className="text-accent hover:underline" onClick={() => set({ ex: pool.map((r) => r.id) })}>Clear</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...pool].sort((a, b) => a.f.short.localeCompare(b.f.short)).map((r) => {
            const on = !s.ex.includes(r.id);
            return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => set({ ex: on ? [...s.ex, r.id] : s.ex.filter((x) => x !== r.id) })}
                className={`rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors ${on ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--accent-soft)] text-ink" : "border-line text-muted hover:text-ink"}`}>
                {r.f.short}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-2">
          <Switch label="Only brokers paid for orders" checked={s.paid} onChange={(paid) => set({ paid })} />
          <Switch label="Include clearing firm (Apex)" checked={s.clr} onChange={(clr) => set({ clr })} />
        </div>
      </Group>
      {changed && (
        <button type="button" onClick={() => setS(def)} className="mt-4 w-full rounded-xl border border-line py-2 text-[13px] font-semibold text-ink2 hover:border-accent hover:text-ink">
          Reset everything
        </button>
      )}
    </Card>
  );

  return (
    <div className="rise">
      <PageHeader eyebrow="Explore" title="Explore the data yourself"
        sub="Choose what to measure, filter and sort. The chart, the summary and the table all update as you go, and the link in your address bar saves your view." />

      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="mb-4 inline-flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-ink lg:hidden">
        Measure, filters &amp; sorting<Icon name="right" size={16} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${open ? "block" : "hidden"} self-start lg:sticky lg:top-[84px] lg:block lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto`}>{controls}</aside>

        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-line p-5 shadow-card" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))" }}>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-accent">In one sentence</div>
            <p className="mt-1.5 text-[16.5px] leading-relaxed text-ink [&_b]:font-semibold">{summary ?? "Not enough brokers with data for this combination."}</p>
          </div>

          <Card title={V ? `${M.label} vs ${V.label.toLowerCase()}` : M.label} sub={scope} info={<>{M.desc}{V && <><br /><br />{V.desc}</>}</>}
            foot={usesGap ? "The same-trade comparison always uses market orders of every size, so it doesn't change with the order filters." : undefined}>
            {withV.length ? (
              <EChart option={chart} height={V ? 460 : Math.max(240, sorted.length * 28 + 50)} label={`${M.label} by broker`}
                onClick={(p) => p.data?.id && go(`broker/${p.data.id}`)} />
            ) : <Empty>No broker has data for this combination. Try another order size or stock type.</Empty>}
          </Card>

          <Card title="Every number in one table" sub="Same filters as the chart · click a column to sort · click a row for the broker's report"
            right={<a href="#/firms" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">All 100 reporting firms<Icon name="arrow" size={14} /></a>}>
            <DataTable key={`${s.m}-${s.sort}`} rows={shown} cols={cols} highlight={[s.m, s.vs]}
              initial={s.sort === "az" ? { key: "name", dir: 1 } : { key: s.m, dir: ((M.better ? dir : -1) * (s.sort === "worst" ? -1 : 1)) as 1 | -1 }}
              onRow={(r) => go(`broker/${r.id}`)} search={(r) => `${r.f.short} ${r.f.name}`} file={`order_flow_watch_${s.sp}_${s.ot}_${s.b}.csv`} />
          </Card>
        </div>
      </div>
    </div>
  );
}
