// brokers/: the explorer, the site's power-user layer. Every broker on any measure, or one measure plotted against another,
// for the orders and brokers picked. The answer comes first: one generated sentence, then the chart (a ranked rail chart
// in the price scale's anatomy, or a named scatter when a second measure is picked), then every number in a real table
// whose names link to the broker pages. The whole view lives in the query string (components/explorer/view.ts), so a view
// can be linked. On a desktop the controls sit in two rows on the ground over the chart; on phones and tablets they wait
// in a bottom sheet behind "Change view", so the chart comes straight after the heading.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { EChart } from "../charts/EChart";
import { DataTable, type Col } from "../components/DataTable";
import { ControlBar, ControlSheet, type ControlProps } from "../components/explorer/Controls";
import { CopyLink } from "../components/explorer/CopyLink";
import "../components/explorer/explorer.css";
import { RankChart } from "../components/explorer/RankChart";
import { PLOT_H, scatterOption } from "../components/explorer/scatter";
import { cap, defaults, fromUrl, isFee, isPay, tidy, toQuery, type Sort, type View } from "../components/explorer/view";
import { Card, Icon, Legend, PageHeader, Segmented } from "../components/ui";
import { andList } from "../lib/broker";
import { brokerRows, BUCKET_LABEL, files606, type Data, type FeeKey, type Metric } from "../lib/data";
import { dayLong, monthLong, quarterLong, strength } from "../lib/format";
import { onNavigate, readLocation, readQuery, writeQuery } from "../lib/hooks";
import { METRIC_KEYS, METRICS, type MetricKey } from "../lib/metrics";
import { brokerPath, href, pagePath, parseRoute } from "../lib/routes";
import { median, spearman } from "../lib/stats";
import { useTheme } from "../lib/theme";

/** A box's width, kept current as it resizes (0 until measured, and on the server); a change waits 150ms to settle, so
 *  dragging a window edge doesn't rebuild the scatter on every frame. `on`: the box is on the page. */
function useWidth(ref: RefObject<HTMLElement>, on: boolean): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let timer: number | undefined;
    const read = () => setW(Math.round(el.getBoundingClientRect().width));
    read();
    const ro = new ResizeObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(read, 150); });
    ro.observe(el);
    return () => { ro.disconnect(); window.clearTimeout(timer); };
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  return w;
}

/** Whether a table's scroll box (DataTable's .dt-box inside `ref`) is wider inside than out (`over`), and whether
 *  columns wait to its right (`more`: its edge fades while they do). Both true until measured, as they always are for
 *  the 14 columns here, so the pre-rendered page has the cue too and nothing moves once the script runs. `key` changes
 *  when the table is rebuilt. */
function useSideCue(ref: RefObject<HTMLElement>, key: string): { over: boolean; more: boolean } {
  const [cue, setCue] = useState({ over: true, more: true });
  useEffect(() => {
    const box = ref.current?.querySelector<HTMLElement>(".dt-box");
    if (!box) return;
    const check = () => {
      const over = box.scrollWidth > box.clientWidth + 1, more = box.scrollLeft + box.clientWidth < box.scrollWidth - 1;
      setCue((c) => (c.over === over && c.more === more ? c : { over, more }));
    };
    check();
    box.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(box);
    if (box.firstElementChild) ro.observe(box.firstElementChild);
    return () => { box.removeEventListener("scroll", check); ro.disconnect(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return cue;
}

/** `search`: the query string the page was opened with; later same-page changes arrive through onNavigate. */
export default function Explore({ d, search }: { d: Data; search: string }) {
  const { t } = useTheme();
  // the scatter's names are placed for the width it is drawn at (scatter.ts), and again once the site's face has loaded
  const plot = useRef<HTMLDivElement>(null);
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => { if (live) setFonts(true); });
    return () => { live = false; };
  }, []);
  const [s, setS] = useState<View>(() => fromUrl(d, search));
  const [sheet, setSheet] = useState(false); // the controls' sheet on phones and tablets
  const set = (p: Partial<View>) => setS((x) => ({ ...x, ...p, ...(p.m && p.m === x.vs ? { vs: "" as const } : {}) }));
  const def = defaults(d);
  const changed = JSON.stringify(s) !== JSON.stringify(def);

  useEffect(() => { writeQuery(toQuery(d, s)); }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  // a same-page navigation (a shared link, the back button) loads its view; the bare nav link gets the current view written back
  useEffect(() => onNavigate(() => {
    const loc = readLocation();
    if (parseRoute(d, loc.path).page !== "brokers") return;
    if (readQuery(loc.search).toString()) setS(fromUrl(d, loc.search)); else writeQuery(toQuery(d, s));
  }), [d, s]);

  const M = METRICS[s.m], V = s.vs ? METRICS[s.vs] : null;
  /** a measure's figure as shown: a true minus, never "−$0.00" */
  const show = (k: MetricKey) => (v: number | null) => tidy(METRICS[k].fmt(v));
  const fmt = show(s.m);
  const all = useMemo(() => brokerRows(d, { sp: s.sp, ot: s.ot, b: s.b, month: d.meta.month, quarter: s.q, clearing: s.clr }), [d, s.sp, s.ot, s.b, s.q, s.clr]);
  const pool = all.filter((r) => !s.paid || (r.pay10k ?? 0) > 0.005);
  const shown = pool.filter((r) => !s.ex.includes(r.id));
  const withV = shown.filter((r) => M.get(r) != null && (!V || V.get(r) != null));
  // a measure no broker has a figure for yet is flagged in the pickers
  const noData = (k: MetricKey) => !all.some((r) => METRICS[k].get(r) != null);

  const dir = M.better === "high" ? -1 : 1; // "best first"; for a measure with no better direction, high to low
  const order = (a: Metric, b: Metric) => (s.sort === "az" ? a.f.short.localeCompare(b.f.short)
    : (M.get(a)! - M.get(b)!) * (M.better ? dir : -1) * (s.sort === "worst" ? -1 : 1) || a.f.short.localeCompare(b.f.short));
  const sorted = [...withV].sort(order);
  const med = median(withV.map((r) => M.get(r)!));
  const byVal = [...withV].sort((a, b) => M.get(a)! - M.get(b)!);
  const lo = byVal[0], hi = byVal[byVal.length - 1];
  const best = M.better === "high" ? hi : lo, worst = M.better === "high" ? lo : hi;

  // a broker that hasn't filed the latest payment quarter is shown with its previous one, marked * and named
  const lateOf = (r: Metric) => s.q === d.meta.quarter && r.payQ != null && r.payQ !== s.q;
  const lateNote = (rs: Metric[]) =>
    `* ${andList(rs.map((r) => r.f.short))}: payments from ${quarterLong(rs[0].payQ!)}, the latest ${rs.length > 1 ? "they have" : "it has"} filed.`;
  const payOn = isPay(s.m) || isPay(s.vs);
  const feeOn = isFee(s.m) || isFee(s.vs);
  // every measure shown is a fee: the order filters change nothing in the chart (Controls.tsx greys them out)
  const feeOnly = isFee(s.m) && (!s.vs || isFee(s.vs));

  // ---- the one sentence, rewritten for every view; ties are the brokers showing the same figure
  const n = withV.length, missing = shown.length - n;
  const sameAs = (v: number) => withV.filter((r) => fmt(M.get(r)) === fmt(v));
  const who = (rs: Metric[]): ReactNode => (rs.length > 3 ? <b>{rs.length} brokers</b>
    : rs.map((r, i) => <Fragment key={r.id}>{i > 0 && (i === rs.length - 1 ? " and " : ", ")}<b>{r.f.short}</b></Fragment>));
  const be = (rs: Metric[]) => (rs.length > 1 ? "are" : "is");
  let say: ReactNode = null, empty: ReactNode = null;
  if (!shown.length) {
    empty = <><p>No brokers are picked.</p><button type="button" className="btn btn-ghost" onClick={() => set({ ex: [], paid: false })}>Show every broker</button></>;
  } else if (n === 0) {
    const feeSide = isFee(s.m) ? M : V && isFee(s.vs) ? V : null;
    empty = <p>{feeSide && !all.some((r) => feeSide.get(r) != null) ? `We haven't confirmed the ${feeSide.noun} for any broker yet.`
      : V ? "None of the brokers shown has both numbers."
        : feeOn || payOn ? "None of the brokers shown has this number."
          : "None of the brokers shown has this number for these orders. Try another order size or stock group."}</p>;
  } else if (V && n < 4) {
    say = <>Only {n} of {shown.length} brokers have both numbers; at least four are needed to see a pattern.</>;
  } else if (V) {
    const xs = withV.map((r) => V.get(r)!), ys = withV.map((r) => M.get(r)!);
    const rho = spearman(xs, ys);
    if (rho == null) {
      const flat = new Set(xs).size === 1 ? V : M; // one side doesn't vary at all (every commission is $0)
      say = <>Every broker has the same <b>{flat.noun}</b> ({tidy(flat.fmt(flat.get(withV[0])))}): nothing to compare.</>;
    } else {
      const a = Math.abs(rho), way = rho > 0 ? "higher" : "lower";
      // the wording follows the strength labels in format.ts, so the sentence never claims more than the number shows
      const lead = a < 0.2 ? <>No clear pattern between <b>{V.noun}</b> and <b>{M.noun}</b>.</>
        : a < 0.4 ? <>A weak tendency at most: higher <b>{V.noun}</b>, slightly {way} <b>{M.noun}</b>; with {n} brokers it could be chance.</>
          : <>Brokers with a higher <b>{V.noun}</b> tend to have a {way} <b>{M.noun}</b>.</>;
      const across = (a >= 0.2 && a < 0.4) || missing ? "" : ` across ${n} brokers`; // the weak case and the note below name the count
      say = <>{lead} <span className="ex-quiet">{tidy(rho.toFixed(2))} on a −1 to 1 scale ({strength(rho)}){across}.</span></>;
    }
  } else if (n === 1) {
    say = <>Only <b>{withV[0].f.short}</b> has this number: {fmt(M.get(withV[0]))}.</>;
  } else if (fmt(M.get(lo)) === fmt(M.get(hi))) {
    say = <>All {n} brokers have the same <b>{M.noun}</b>: {fmt(M.get(lo))}.</>;
  } else if (M.better) {
    const bs = sameAs(M.get(best)!), ws = sameAs(M.get(worst)!);
    say = <>{who(bs)} {be(bs)} best at {fmt(M.get(best))} and {who(ws)} worst at {fmt(M.get(worst))}; the typical broker is at {fmt(med)}.</>;
  } else {
    // no better direction (payment, order size, speed): the range, which reads the same way for every unit
    say = <>{cap(M.noun)} runs from {fmt(M.get(lo))} ({who(sameAs(M.get(lo)!))}) to {fmt(M.get(hi))} ({who(sameAs(M.get(hi)!))}); the typical broker is at {fmt(med)}.</>;
  }
  if (say && missing > 0) {
    const what = V ? "both numbers" : isFee(s.m) ? "a figure for this fee" : "this number";
    say = <>{say} <span className="ex-quiet">{n} of {shown.length} brokers have {what}; the rest are named under the chart.</span></>;
  }

  // ---- what the figures cover, and what they leave out
  const lower = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
  const orders = [s.sp === "Y" ? "S&P 500 stocks" : "Other stocks", `${s.ot === "M" ? "market" : "marketable limit"} orders`,
    lower(BUCKET_LABEL[s.b]), monthLong(d.meta.month)];
  const scope = [...orders, ...(payOn ? [`payments ${quarterLong(s.q)}`] : [])].join(" · ");
  const feeScope = d.meta.feesChecked ? `fees checked ${dayLong(d.meta.feesChecked)}` : "fees from each broker's price list";
  const sub = feeOnly ? cap(feeScope) : feeOn ? `${scope} · ${feeScope}` : scope;
  // the table holds every measure, so its caption names every scope, whatever the chart shows
  const tableScope = [...orders, `payments ${quarterLong(s.q)}`, feeScope].join(" · ");

  /** Why a broker has no figure for a measure, in the words the fee list and the payment reports use. */
  const why = (r: Metric): string => {
    const k = M.get(r) == null ? s.m : (s.vs as MetricKey);
    if (isFee(k)) {
      const f = d.fees[r.id], fk = k as FeeKey;
      return !f ? "no price list here" : f.notOffered.includes(fk) ? "not offered" : f.varies.includes(fk) ? "it varies" : "not confirmed yet";
    }
    if (isPay(k)) return files606(d, r.f.crd) ? "no payment rate for these orders" : "";
    return "no figure for these orders";
  };
  const notes: string[] = [];
  if (s.m === "gap" || s.vs === "gap") notes.push(`${METRICS.gap.short}: market orders of every size; the order filters don't apply.`);
  if (s.m === "fract" || s.vs === "fract") {
    notes.push(`Fractional vs whole: market orders under $200,000 in ${monthLong(d.meta.detailMonth)}; the order type, size and quarter filters don't apply.`);
  }
  if (feeOn && !feeOnly) notes.push("Fees ignore the stock and order filters.");
  const late = payOn ? withV.filter(lateOf) : [];
  if (late.length) notes.push(lateNote(late));
  const left = new Map<string, string[]>();
  for (const r of shown.filter((x) => !withV.includes(x))) left.set(why(r), [...(left.get(why(r)) ?? []), r.f.short]);
  const silent = left.get(""); // brokers that file no payment report of their own
  if (silent) {
    notes.push(silent.length > 1
      ? `${andList(silent)} file no payment report of their own (another firm routes their orders), so they aren't in the chart.`
      : `${silent[0]} files no payment report of its own (another firm routes its orders), so it isn't in the chart.`);
    left.delete("");
  }
  if (left.size) notes.push(`Not in the chart: ${[...left].map(([w, names]) => `${andList(names)} (${w})`).join("; ")}.`);

  const tableNotes: string[] = [];
  const lateRows = shown.filter((r) => lateOf(r) && r.pay10k != null);
  if (lateRows.length) tableNotes.push(lateNote(lateRows));
  if (shown.some((r) => !files606(d, r.f.crd))) tableNotes.push("No report: files no payment report of its own (another firm routes its orders).");

  // ---- the chart: ranked rails, or a scatter when a second measure is picked
  const tipRows = (r: Metric): [string | null, string, string][] =>
    [s.m, ...(s.vs ? [s.vs] : []), ...METRIC_KEYS.filter((k) => k !== s.m && k !== s.vs && METRICS[k].get(r) != null)]
      .map((k) => [null, METRICS[k].short, show(k)(METRICS[k].get(r))]);
  const cw = useWidth(plot, !!V && n > 0);
  const scatter = useMemo(() => (V && cw > 0 && n > 0 ? scatterOption(t, withV.map((r) => ({ id: r.id, name: r.f.short, x: V.get(r)!, y: M.get(r)!, rows: tipRows(r) })), {
    x: { name: V.label, short: V.short, fmt: (v) => tidy(V.axis(v)) },
    y: { name: M.label, short: M.short, fmt: (v) => tidy(M.axis(v)) },
    typical: [median(withV.map((r) => V.get(r)!)) ?? 0, med ?? 0],
    width: cw,
  }) : null), [t, s, all, cw, fonts]); // eslint-disable-line react-hooks/exhaustive-deps
  const ranked = sorted.map((r) => ({ id: r.id, name: r.f.short, v: M.get(r)!, text: fmt(M.get(r)) + (isPay(s.m) && lateOf(r) ? "*" : "") }));
  const orderWords = s.sort === "az" ? "A to Z" : M.better ? (s.sort === "worst" ? "worst first" : "best first") : s.sort === "worst" ? "low to high" : "high to low";
  const sortOpts: [Sort, string][] = M.better
    ? [["best", "Best first"], ["worst", "Worst first"], ["az", "A–Z"]]
    : [["best", "High to low"], ["worst", "Low to high"], ["az", "A–Z"]];

  // ---- the table: every measure, the picked ones first (they stay in view while it scrolls sideways) and tinted
  const cell = (r: Metric, k: MetricKey): ReactNode => {
    const v = METRICS[k].get(r);
    if (v == null) {
      const f = isFee(k) ? d.fees[r.id] : undefined, fk = k as FeeKey;
      if (f) return <span className="ex-unk">{f.notOffered.includes(fk) ? "Not offered" : f.varies.includes(fk) ? "Varies" : "Not confirmed"}</span>;
      if (isPay(k) && !files606(d, r.f.crd)) return <span className="ex-unk">No report</span>;
      return <><span aria-hidden="true">–</span><span className="sr-only">No figure</span></>;
    }
    return <>{show(k)(v)}{isPay(k) && lateOf(r) && <><span aria-hidden="true">*</span><span className="sr-only"> (from {quarterLong(r.payQ!)})</span></>}</>;
  };
  const colOrder = [s.m, ...(s.vs ? [s.vs] : []), ...METRIC_KEYS.filter((k) => k !== s.m && k !== s.vs)];
  const cols: Col<Metric>[] = [
    { key: "name", label: "Broker", pin: true, value: (r) => r.f.short },
    ...colOrder.map((k): Col<Metric> => ({ key: k, label: METRICS[k].short, num: true, hint: METRICS[k].desc, value: (r) => METRICS[k].get(r), render: (r) => cell(r, k) })),
  ];

  // a new measure or order rebuilds the table, starting it sorted on that measure
  const tableKey = `${s.m}-${s.sort}`;
  const table = useRef<HTMLDivElement>(null);
  const { over, more } = useSideCue(table, tableKey);

  const controls: ControlProps = { d, s, set, reset: () => setS(def), changed, all, pool, shown: shown.length, noData };

  return (
    <>
      <PageHeader title="Every broker, every number" intro="Rank the brokers on any measure, or plot one against another."
        right={(
          <div className="ex-acts">
            <button type="button" className="btn btn-solid ex-open js-only" aria-haspopup="dialog" onClick={() => setSheet(true)}>
              <Icon name="tune" size={20} />Change view
            </button>
            <CopyLink />
          </div>
        )} />
      <p className="q-wait" role="status">Loading this view…</p>

      <div className="q-live">
        <ControlBar {...controls} />
        <ControlSheet {...controls} open={sheet} onClose={() => setSheet(false)} count={n} />

        <div className="ex-cards">
          <Card title={V ? `${M.label} vs ${V.label.toLowerCase()}` : M.label} sub={sub}
            info={V ? `${M.label}: ${M.desc} ${V.label}: ${V.desc}` : M.desc} infoTopic={V ? "the two measures" : M.label}
            right={!V && n > 1 ? (
              <span className="ex-sort js-only"><Segmented<Sort> size="sm" label="Sort the brokers" value={s.sort} onChange={(sort) => set({ sort })} options={sortOpts} /></span>
            ) : undefined}
            foot={notes.length ? notes.map((x) => <p key={x}>{x}</p>) : undefined}>
            {/* one live region for the answer, so a screen reader hears the new sentence (or why there is none) after each pick */}
            <div className="ex-result" role="status">
              {say ? <p className="ex-say">{say}</p> : empty ? <div className="empty ex-empty">{empty}</div> : null}
            </div>
            {n > 0 && (V ? (
              <>
                {/* the typical lines' name, as a key, so no word inside the plot can run into a dot's name */}
                <div className="ex-key"><Legend items={[{ color: "var(--mark)", label: "Typical broker", dashed: true }]} /></div>
                <div ref={plot} className="ex-plot" style={{ minHeight: PLOT_H }}>
                  {scatter && <EChart option={scatter.option} height={PLOT_H} label={`${M.label} against ${V.label.toLowerCase()}: one dot per broker, ${n} brokers. Every figure is in the table below.`} />}
                </div>
                {/* a dot whose name had no clear place: the tooltip names it, the table lists it; "tap" or "point at" by the pointer */}
                {scatter && scatter.unnamed > 0 && (
                  <p className="ex-names">Unnamed dots: <span className="ex-touch">tap</span><span className="ex-mouse">point at</span> one for its name, or see the table below.</p>
                )}
              </>
            ) : (
              <RankChart rows={ranked} typ={med!} typText={fmt(med)} zeroText={tidy(M.axis(0))}
                label={`${M.label}: ${n} brokers, ${orderWords}. Every figure is in the table below.`} />
            ))}
          </Card>

          {/* 14 columns don't fit the card: one sentence says the table scrolls sideways, and its right edge fades while
              columns wait there (data-more, explorer.css) */}
          <Card title="Every number in one table" sub={`Each broker's name opens its page.${over ? " Scroll sideways for more columns." : ""}`}
            right={<a className="go" href={href(pagePath("firms"))}>All {Object.keys(d.reporters).length} firms that report prices<Icon name="arrow" size={20} /></a>}
            foot={tableNotes.length ? tableNotes.map((x) => <p key={x}>{x}</p>) : undefined}>
            <div ref={table} className="ex-tbl" data-more={more ? "" : undefined}>
              <DataTable key={tableKey} rows={shown} cols={cols} highlight={[s.m, s.vs]} rowKey={(r) => r.id}
                initial={s.sort === "az" ? { key: "name", dir: 1 } : { key: s.m, dir: ((M.better ? dir : -1) * (s.sort === "worst" ? -1 : 1)) as 1 | -1 }}
                rowHref={(r) => href(brokerPath(r.f.slug))} search={(r) => `${r.f.short} ${r.f.name}`} searchLabel="Search brokers"
                caption={`Every number for the brokers shown: ${tableScope}`}
                file={`brokers-${s.sp === "Y" ? "sp500" : "other-stocks"}-${s.ot === "M" ? "market" : "marketable-limit"}-orders.csv`} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
