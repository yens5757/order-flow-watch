// The interactive layer: pick a measure, optionally a second one to compare, filter and sort.
// Chart, summary and table all follow the same settings, which also live in the URL.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { labeledScatter, ranked } from "../charts/options";
import { DataTable, type Col } from "../components/DataTable";
import { Card, Empty, Icon, Info, PageHeader, Segmented, Select, Switch } from "../components/ui";
import { brokerRows, BUCKET_LABEL, BUCKETS, idFromUrl, slugOf, type Data, type Metric, type Ot, type Sp } from "../lib/data";
import { dayLong, quarterLong, strength } from "../lib/format";
import { go, onNavigate, readLocation, readQuery, writeQuery } from "../lib/hooks";
import { METRIC_KEYS, METRICS, type MetricKey } from "../lib/metrics";
import { brokerPath, href, pagePath, parseRoute } from "../lib/routes";
import { median, spearman } from "../lib/stats";
import { useTheme } from "../lib/theme";

type Sort = "best" | "worst" | "az";
interface S { m: MetricKey; vs: MetricKey | ""; sp: Sp; ot: Ot; b: number; q: string; sort: Sort; ex: string[]; paid: boolean; clr: boolean }

const isKey = (v: string | null): v is MetricKey => !!v && (METRIC_KEYS as string[]).includes(v);
// fee measures come from each broker's own pricing pages (fees.csv), not from the 605/606 reports: the order filters never touch them
const isFee = (k: MetricKey | ""): boolean => k !== "" && METRICS[k].source === "published";
// the fee group's heading also carries the date the fees were last checked (meta.feesChecked), added where it renders
const MEASURE_GROUPS: [string, MetricKey[]][] = [
  ["Prices and payments", METRIC_KEYS.filter((k) => !isFee(k))],
  ["Fees", METRIC_KEYS.filter((k) => isFee(k))],
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const defaults = (d: Data): S => ({ m: "cost10k", vs: "", sp: "Y", ot: "M", b: 199999, q: d.meta.quarter, sort: "best", ex: [], paid: false, clr: false });

/** The view a query string describes (brokers/?m=cost10k&vs=pay10k&ex=webull,moomoo); anything missing or odd is the default. */
function fromUrl(d: Data, search: string): S {
  const p = readQuery(search), s = defaults(d);
  return {
    m: isKey(p.get("m")) ? (p.get("m") as MetricKey) : s.m,
    vs: isKey(p.get("vs")) && p.get("vs") !== p.get("m") ? (p.get("vs") as MetricKey) : "",
    sp: p.get("sp") === "N" ? "N" : "Y",
    ot: p.get("ot") === "ML" ? "ML" : "M",
    b: p.has("b") && BUCKETS.some(([b]) => b === Number(p.get("b"))) ? Number(p.get("b")) : s.b,
    q: d.meta.quarters.includes(p.get("q") ?? "") ? p.get("q")! : s.q,
    sort: (["best", "worst", "az"] as const).find((x) => x === p.get("sort")) ?? "best",
    // slugs (or reporter ids from older links) of the brokers hidden; unknown names are dropped
    ex: (p.get("ex") ?? "").split(",").map((x) => idFromUrl(d, x)).filter((x): x is string => x != null),
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

/** `search`: the query string the page was opened with; later same-page changes arrive through onNavigate. */
export default function Explore({ d, search }: { d: Data; search: string }) {
  const { t } = useTheme();
  const [s, setS] = useState<S>(() => fromUrl(d, search));
  const [open, setOpen] = useState(false); // filters panel on phones
  const set = (p: Partial<S>) => setS((x) => ({ ...x, ...p, ...(p.m && p.m === x.vs ? { vs: "" as const } : {}) }));
  const def = defaults(d);

  const toQuery = (s: S) => ({
    m: s.m !== def.m ? s.m : null, vs: s.vs || null, sp: s.sp !== "Y" ? s.sp : null, ot: s.ot !== "M" ? s.ot : null,
    b: s.b !== def.b ? s.b : null, q: s.q !== def.q ? s.q : null, sort: s.sort !== "best" ? s.sort : null,
    ex: s.ex.length ? s.ex.map((id) => slugOf(d, id)).join(",") : null, paid: s.paid ? 1 : null, clr: s.clr ? 1 : null,
  });
  useEffect(() => { writeQuery(toQuery(s)); }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  // a same-page navigation (a shared link, the back button) loads its view; the bare nav link gets the current view written back
  useEffect(() => onNavigate(() => {
    const loc = readLocation();
    if (parseRoute(d, loc.path).page !== "brokers") return;
    if (readQuery(loc.search).toString()) setS(fromUrl(d, loc.search)); else writeQuery(toQuery(s));
  }), [d, s]); // eslint-disable-line react-hooks/exhaustive-deps

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
    METRIC_KEYS.filter((k) => k === s.m || k === s.vs || METRICS[k].get(r) != null) // a fee the broker hasn't published would only add a "–" row
      .map((k) => [k === s.m || k === s.vs ? t.s[METRICS[k].slot] : null, METRICS[k].short, METRICS[k].fmt(METRICS[k].get(r))]);

  const chart = useMemo(() => (V
    ? labeledScatter(t, withV.map((r) => ({ id: r.id, name: r.f.short, x: V.get(r)!, y: M.get(r)!, rows: tipRows(r) })), {
      xName: V.label, yName: M.label, xFmt: V.axis, yFmt: M.axis, clickable: true,
      medians: [median(withV.map((r) => V.get(r)!)) ?? 0, med ?? 0],
    })
    : ranked(t, sorted.map((r) => ({ id: r.id, name: r.f.short, v: M.get(r)!, rows: tipRows(r) })), {
      fmt: (v) => M.fmt(v), axis: M.axis, color: t.s[M.slot], diverging: M.diverging, median: med,
    })), [t, s, all]); // eslint-disable-line react-hooks/exhaustive-deps

  // fee measures: a broker without a confirmed figure is left out of the chart and the sentence, never scored as zero
  const feeOn = isFee(s.m) || isFee(s.vs);
  const feeSide = isFee(s.m) ? M : V;
  const feeMissing = feeOn && !shown.some((r) => feeSide!.get(r) != null);
  // a measure no broker has a value for yet (today: interest on idle cash) is flagged in the list, so nobody picks it blind
  const noData = (k: MetricKey) => !all.some((r) => METRICS[k].get(r) != null);

  // the one-sentence takeaway, rewritten for every combination
  const n = withV.length, missing = shown.length - n;
  const at = (v: number) => withV.filter((r) => M.get(r) === v); // every broker on a tied value (many are paid exactly $0)
  const who = (rs: Metric[]): ReactNode => rs.length > 3 ? <b>{rs.length} brokers</b>
    : rs.map((r, i) => <Fragment key={r.id}>{i > 0 && (i === rs.length - 1 ? " and " : ", ")}<b>{r.f.short}</b></Fragment>);
  let summary: ReactNode;
  if (n === 0) {
    summary = feeMissing ? <>We haven't confirmed <b>{feeSide!.noun}</b> for any broker yet.</> : <>No data for this combination.</>;
  } else if (V && n < 4) {
    summary = <>Only {n} of {shown.length} brokers have both numbers; at least four are needed.</>;
  } else if (V) {
    const xs = withV.map((r) => V.get(r)!), ys = withV.map((r) => M.get(r)!);
    const rho = spearman(xs, ys);
    if (rho == null) {
      const same = new Set(xs).size === 1 ? V : M; // one side has no spread at all (every commission is $0)
      summary = <>Every broker has the same <b>{same.noun}</b> ({same.fmt(same.get(withV[0]))}): nothing to compare.</>;
    } else {
      const a = Math.abs(rho), way = rho > 0 ? "higher" : "lower";
      // wording follows the strength labels in format.ts, so the sentence never claims more than the number shows
      summary = a < 0.2
        ? <>No clear pattern between <b>{V.noun}</b> and <b>{M.noun}</b>.</>
        : a < 0.4
          ? <>A weak tendency at most: higher <b>{V.noun}</b>, slightly {way} <b>{M.noun}</b>; with {n} brokers it could be chance.</>
          : <>Brokers with a higher <b>{V.noun}</b> tend to have a {way} <b>{M.noun}</b>.</>;
      const across = (a >= 0.2 && a < 0.4) || missing ? "" : ` across ${n} brokers`; // the weak case and the note below already name the count
      summary = <>{summary} <span className="text-muted">{rho.toFixed(2)} on a −1 to 1 scale ({strength(rho)}){across}.</span></>;
    }
  } else if (n === 1) {
    summary = <>Only <b>{withV[0].f.short}</b> has this number: {M.fmt(M.get(withV[0]))}.</>;
  } else if (M.get(lo) === M.get(hi)) {
    summary = <>All {n} brokers have the same <b>{M.noun}</b>: {M.fmt(M.get(lo))}.</>;
  } else if (M.better) {
    const bs = at(M.get(best)!), ws = at(M.get(worst)!);
    summary = <>{who(bs)} best ({M.fmt(M.get(best))}), {who(ws)} worst ({M.fmt(M.get(worst))}); typical broker {M.fmt(med)}.</>;
  } else {
    // no better direction (speed, order size, payment): give the range, which reads the same way for every unit
    summary = <>{cap(M.noun)} ranges from {M.fmt(M.get(lo))} ({who(at(M.get(lo)!))}) to {M.fmt(M.get(hi))} ({who(at(M.get(hi)!))}); typical broker {M.fmt(med)}.</>;
  }
  if (n > 0 && missing > 0) {
    const what = V ? "both numbers" : isFee(s.m) ? "a confirmed fee" : "this number";
    summary = <>{summary} <span className="text-muted">{n} of {shown.length} brokers have {what}; the rest aren't scored.</span></>;
  }

  const scope = `${s.sp === "Y" ? "S&P 500" : "Other"} stocks · ${s.ot === "M" ? "market" : "marketable limit"} orders · ${BUCKET_LABEL[s.b].toLowerCase()} · payments ${quarterLong(s.q)}`;
  const feeScope = `fees${d.meta.feesChecked ? ` checked ${dayLong(d.meta.feesChecked)}` : ""}`;
  const sub = isFee(s.m) && (!V || isFee(s.vs)) ? cap(feeScope) : feeOn ? `${scope} · ${feeScope}` : scope;
  const usesGap = s.m === "gap" || s.vs === "gap";
  const foot = [
    usesGap ? "Same-trade gap: market orders of every size; the order filters don't apply." : "",
    feeOn ? "Fees ignore the stock and order filters; a broker without a confirmed figure is left out." : "",
  ].filter(Boolean).join(" ");
  const sortOpts: [Sort, string][] = M.better ? [["best", "Best first"], ["worst", "Worst first"], ["az", "A–Z"]] : [["best", "High → low"], ["worst", "Low → high"], ["az", "A–Z"]];
  const changed = JSON.stringify(s) !== JSON.stringify(def);

  // the chosen measure(s) come right after the broker's name, so they are never off-screen in a sideways-scrolling table
  const colOrder = [s.m, ...(s.vs ? [s.vs] : []), ...METRIC_KEYS.filter((k) => k !== s.m && k !== s.vs)];
  const cols: Col<Metric>[] = [
    { key: "name", label: "Broker", pin: true, value: (r) => r.f.short, render: (r) => <span className="font-medium text-ink">{r.f.short}</span> },
    ...colOrder.map((k): Col<Metric> => ({ key: k, label: METRICS[k].short, num: true, hint: METRICS[k].desc, value: (r) => METRICS[k].get(r), render: (r) => METRICS[k].fmt(METRICS[k].get(r)) })),
  ];

  const controls = (
    <Card>
      <Group title="Measure">
        <div className="space-y-1.5" role="radiogroup" aria-label="Measure">
          {MEASURE_GROUPS.map(([title, keys], gi) => (
            <Fragment key={title}>
              <div className={`px-3 text-[11px] font-semibold uppercase tracking-wider text-muted ${gi ? "mt-2 border-t border-line pt-3" : ""}`}>
                {title}
                {keys.some((k) => isFee(k)) && d.meta.feesChecked && <span className="block text-[11.5px] font-normal normal-case tracking-normal">Checked {dayLong(d.meta.feesChecked)}</span>}
              </div>
              {keys.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={s.m === k} onClick={() => set({ m: k })} aria-disabled={noData(k) || undefined}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${s.m === k ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-surface2"}`}>
                  <span className={`flex items-center gap-2 text-[13.5px] font-medium ${noData(k) ? "text-muted" : "text-ink"}`}>
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.s[METRICS[k].slot] }} />{METRICS[k].label}
                    {noData(k) && <span className="text-[11.5px] font-normal text-muted">· no data yet</span>}
                  </span>
                  {s.m === k && <span className="mt-1 block text-[12.5px] leading-snug text-ink2">{METRICS[k].desc}</span>}
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </Group>
      <Group title="Compare with" info="Plots every broker as a dot.">
        <Select full label="Compare with" value={s.vs} onChange={(vs) => set({ vs: vs as MetricKey | "" })}
          options={[["", "Nothing (ranked list)"], ...METRIC_KEYS.filter((k) => k !== s.m).map((k) => [k, METRICS[k].label + (noData(k) ? " · no data yet" : "")] as [string, string])]} />
      </Group>
      <Group title="Stocks"><Segmented size="sm" label="Stocks" value={s.sp} onChange={(sp) => set({ sp })} options={[["Y", "S&P 500"], ["N", "Other stocks"]]} /></Group>
      <Group title="Order" info="Market orders fill at once; marketable limit orders add a price cap.">
        <div className="space-y-2.5">
          <Segmented size="sm" label="Order type" value={s.ot} onChange={(ot) => set({ ot })} options={[["M", "Market"], ["ML", "Marketable limit"]]} />
          <Select full label="Order size" value={s.b} onChange={(b) => set({ b })} options={BUCKETS} />
        </div>
      </Group>
      <Group title="Payments from"><Select full label="Quarter" value={s.q} onChange={(q) => set({ q })} options={[...d.meta.quarters].reverse().map((q) => [q, quarterLong(q)])} /></Group>
      <Group title="Sort"><Segmented size="sm" label="Sort" value={s.sort} onChange={(sort) => set({ sort })} options={sortOpts} /></Group>
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
          <div className="flex items-center gap-1.5">
            <Switch label="Show Apex Clearing" checked={s.clr} onChange={(clr) => set({ clr })} />
            <Info>Apex routes orders for several brokers; you can't open an account there.</Info>
          </div>
        </div>
      </Group>
      {changed && (
        <button type="button" onClick={() => setS(def)} className="mt-4 w-full rounded-xl border border-line py-2 text-[13px] font-semibold text-ink2 hover:border-accent hover:text-ink">
          Reset
        </button>
      )}
    </Card>
  );

  return (
    <div className="rise">
      <PageHeader eyebrow="Brokers" title="Every broker, every number"
        sub="The link in your address bar saves your view." />

      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="mb-4 inline-flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-ink lg:hidden">
        Measure &amp; filters<Icon name="right" size={16} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${open ? "block" : "hidden"} self-start lg:sticky lg:top-[84px] lg:block lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto`}>{controls}</aside>

        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-line p-5 shadow-card" style={{ background: "linear-gradient(120deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))" }}>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-accent">In one sentence</div>
            <p className="mt-1.5 text-[16.5px] leading-relaxed text-ink [&_b]:font-semibold">{summary}</p>
          </div>

          <Card title={V ? `${M.label} vs ${V.label.toLowerCase()}` : M.label} sub={sub} info={<>{M.desc}{V && <><br /><br />{V.desc}</>}</>}
            foot={foot || undefined}>
            {withV.length ? (
              <EChart option={chart} height={V ? 460 : Math.max(240, sorted.length * 28 + 50)} label={`${M.label} by broker`}
                onClick={(p) => p.data?.id && go(brokerPath(slugOf(d, p.data.id)))} />
            ) : feeMissing ? <p className="text-[13.5px] text-muted">Pick another measure.</p>
              : <Empty>Try another order size or stock type.</Empty>}
          </Card>

          <Card title="Every number in one table" sub="Click a row for the broker's report"
            right={<a href={href(pagePath("firms"))} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">Every firm that reports ({Object.keys(d.reporters).length})<Icon name="arrow" size={14} /></a>}>
            <DataTable key={`${s.m}-${s.sort}`} rows={shown} cols={cols} highlight={[s.m, s.vs]}
              initial={s.sort === "az" ? { key: "name", dir: 1 } : { key: s.m, dir: ((M.better ? dir : -1) * (s.sort === "worst" ? -1 : 1)) as 1 | -1 }}
              onRow={(r) => go(brokerPath(r.f.slug))} search={(r) => `${r.f.short} ${r.f.name}`}
              file={`brokers-${s.sp === "Y" ? "sp500" : "other-stocks"}-${s.ot === "M" ? "market" : "marketable-limit"}-orders.csv`} />
          </Card>
        </div>
      </div>
    </div>
  );
}
