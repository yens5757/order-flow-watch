// compare/<a>-vs-<b>/: two brokers side by side in plain words: what a $10,000 trade costs at each, what each is paid
// for the order, its fees and its regulator records. The URL names the pair in one order (alphabetical by slug, see
// comparePath); compare/ shows Robinhood vs Fidelity. Unknown ids fall back to those.
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { lines } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { Card, ChartTable, Empty, Icon, Info, PageHeader, Segmented, Select, Status } from "../components/ui";
import { execKey, files606, metric, nameOf, OT_LABEL, SIZE_STEPS, slugOf, SP_LABEL, type Data, type Fee, type Filters, type Firm, type Metric } from "../lib/data";
import { dayLong, monthLong, quarterLong, signed, usd2 } from "../lib/format";
import { go } from "../lib/hooks";
import { METRICS, type MetricKey } from "../lib/metrics";
import { brokerPath, comparePath, DEFAULT_PAIR, href, pagePath, pairOrder } from "../lib/routes";
import { useTheme } from "../lib/theme";

const SIZE_SHORT: Record<number, string> = { 0: "<$250", 250: "$250", 1000: "$1k", 5000: "$5k", 10000: "$10k", 20000: "$20k", 50000: "$50k", 200000: "$200k+" };
/** The pairs people search for most, in the order they are shown. */
const POPULAR: [string, string][] = [
  ["HOOD", "FIBS"], ["HOOD", "CHAS"], ["HOOD", "WBUS"], ["WBUS", "FUTM"], ["CHAS", "FIBS"], ["FIBS", "VGRD"], ["SOFI", "HOOD"], ["TTSI", "HOOD"],
];

type Better = "low" | "high" | null;
/** One line of the side-by-side table: a number per broker (the better one marked by `better`), or two ready-made cells. */
interface Row {
  key: string; label: string; info?: ReactNode;
  better?: Better; av?: number | null; bv?: number | null; fmt?: (v: number | null) => string;
  /** shown in place of a missing number, one text or one per side */
  na?: string | [string, string];
  a?: ReactNode; b?: ReactNode;
}
interface Group { title: string; sub?: string; rows: Row[] }

const winner = (better: Better, av: number | null, bv: number | null): "a" | "b" | null =>
  better == null || av == null || bv == null || av === bv ? null : (better === "low" ? av < bv : av > bv) ? "a" : "b";

/** "a price $0.10 better than the fair price" or "$0.95 above the fair price" */
const fair = (v: number) => (v < 0 ? `a price ${usd2(-v)} better than the fair price` : `${usd2(v)} above the fair price`);

/** The short answer, generated from the numbers: who is cheaper on a $10,000 trade, by how much, and whether fees change it. */
function Verdict({ f, A, B, rA, rB, feeA, feeB }: { f: Filters; A: Firm; B: Firm; rA: Metric; rB: Metric; feeA?: Fee; feeB?: Fee }) {
  const stocks = f.sp === "Y" ? "S&P 500 stocks" : "other stocks";
  const order = f.ot === "M" ? "market order" : "marketable limit order";
  const price: ReactNode[] = [], money: ReactNode[] = [];

  // 1. the fill
  const diff = rA.cost10k != null && rB.cost10k != null ? rA.cost10k - rB.cost10k : null; // > 0: B is cheaper
  let cheap: Firm | null = null;
  if (diff == null) {
    price.push(<>{rA.cost10k == null ? A.short : B.short} hasn't published its {monthLong(f.month)} price report yet.</>);
  } else if (Math.abs(diff) < 0.05) {
    price.push(<>Per $10,000 of {order}s in {stocks}, {A.short} and {B.short} customers pay about the same: {fair(rA.cost10k!)} and {fair(rB.cost10k!)}.</>);
  } else {
    const dear = diff > 0 ? A : B;
    cheap = diff > 0 ? B : A;
    const cv = diff > 0 ? rB.cost10k! : rA.cost10k!, dv = diff > 0 ? rA.cost10k! : rB.cost10k!;
    price.push(<>Per $10,000 of {order}s in {stocks}, <strong className="font-semibold text-ink">{cheap.short} customers pay about {usd2(Math.abs(diff))} less</strong> than {dear.short} customers: {fair(cv)} against {fair(dv)}.</>);
  }
  // 2. does it hold on identical trades? (same stocks, same order sizes)
  if (rA.gap != null && rB.gap != null) {
    const g = rA.gap - rB.gap; // > 0: B gets the better price on identical trades
    if (Math.abs(g) < 1) price.push(<> On identical trades the two are level.</>);
    else {
      const same = g > 0 ? B : A;
      price.push(cheap == null || same.id === cheap.id
        ? <> That holds on identical trades too.</>
        : <> On identical trades, though, {same.short} comes out ahead: part of the gap is what each broker's customers trade.</>);
    }
  }

  // 3. what the broker is paid
  const pa = rA.pay10k, pb = rB.pay10k;
  const paid = (F: Firm, v: number | null) =>
    v == null ? `${F.short} files no payment report of its own (another firm routes its orders)`
      : v > 0.005 ? `${F.short} is paid about ${usd2(v)} per $10,000 order`
      : v < -0.005 ? `${F.short} pays its trading firm about ${usd2(-v)} per $10,000 order`
      : `${F.short} isn't paid for orders`;
  if (pa != null && pb != null && pa > 0.005 && pb > 0.005) {
    money.push(<>Trading firms pay {A.short} about {usd2(pa)} and {B.short} about {usd2(pb)} per $10,000 order.</>);
  } else {
    money.push(<>{paid(A, pa)}; {paid(B, pb)}.</>);
  }

  // 4. do fees change the picture?
  const ca = feeA?.commission ?? null, cb = feeB?.commission ?? null;
  if (ca != null && cb != null) {
    if (ca === cb) {
      money.push(ca === 0
        ? <> Neither charges a stock commission.</>
        : <> Both charge {usd2(ca)} per stock trade.</>);
    } else {
      const hi = ca > cb ? A : B, lo = ca > cb ? B : A, gap = Math.abs(ca - cb);
      money.push(<> Commissions: {hi.short} {usd2(Math.max(ca, cb))} per stock trade, {lo.short} {usd2(Math.min(ca, cb))}, which {diff != null && gap > Math.abs(diff) ? "outweighs" : "is smaller than"} the price difference.</>);
    }
  } else {
    const unknown = [ca == null ? A.short : null, cb == null ? B.short : null].filter(Boolean).join(" and ");
    money.push(<> {unknown}'s stock commission is not confirmed yet.</>);
  }
  const oa = feeA?.optionsFee ?? null, ob = feeB?.optionsFee ?? null;
  if (oa != null && ob != null && oa !== ob) {
    money.push(<> Options: {oa < ob ? A.short : B.short} charges less ({usd2(Math.min(oa, ob))} vs {usd2(Math.max(oa, ob))} per contract).</>);
  }

  return (
    <Card title="The short answer" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot]} orders · all sizes under $200,000`}>
      <p className="text-[15.5px] leading-relaxed text-ink2">{price}</p>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink2">{money}</p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
        Not a verdict on which broker is better overall; for your own habits, use the <a href={href(pagePath("calculator"))} className="font-semibold text-accent hover:underline">yearly cost calculator</a>.
      </p>
    </Card>
  );
}

/** `explicit`: the pair is in the URL (compare/<a>-vs-<b>/). On the bare compare/ page the heading names the page and the
 *  pair is a sub-heading linking to its own page, so the two URLs are not copies of one another (one canonical each). */
export default function Compare({ d, f, set, a, b, explicit }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; a: string; b: string; explicit: boolean }) {
  const { t } = useTheme();
  const first = d.byId[a] ?? d.byId[DEFAULT_PAIR[0]] ?? d.brokers[0];
  const second = d.byId[b] ?? d.byId[DEFAULT_PAIR[1]] ?? d.brokers[1];
  // the URL fixes the pair's order; the swap button turns the two columns round on screen
  const [swapped, setSwapped] = useState(false);
  const A = swapped ? second : first, B = swapped ? first : second;
  const s: Filters = { ...f, b: 199999 }; // headline numbers: all orders under $200,000, whatever size the explorer last used
  const rA = metric(d, A, s), rB = metric(d, B, s);
  const feeA: Fee | undefined = d.fees[A.id], feeB: Fee | undefined = d.fees[B.id];
  const order = [...d.firms].sort((x, y) => x.short.localeCompare(y.short));
  const opts: [string, string][] = order.map((o) => [o.id, nameOf(o)]);
  const [unit, setUnit] = useState<"usd" | "pct">("usd");

  // ---------- the side-by-side table ----------
  const fill = (k: MetricKey, fmt = METRICS[k].fmt, na?: Row["na"]): Row =>
    ({ key: k, label: METRICS[k].label, info: METRICS[k].desc, better: METRICS[k].better, av: METRICS[k].get(rA), bv: METRICS[k].get(rB), fmt, na });
  // a fee is "not offered" when the broker has no such product at all (no options trading), "not confirmed" when nobody has checked it
  const feeNa = (k: "optionsFee"): [string, string] => [feeA, feeB].map((x) => (x?.notOffered.includes(k) ? "not offered" : "not confirmed")) as [string, string];
  const checked = [...new Set([feeA, feeB].filter((x): x is Fee => !!x).map((x) => x.checked))];
  const crd = (F: Firm) => d.fees[F.id]?.crd ?? F.crd ?? null; // the account's broker-dealer first; the 606 CRD can be a routing affiliate
  const brokerCheck = (F: Firm) => {
    const c = crd(F);
    return c
      ? <a href={`https://brokercheck.finra.org/firm/summary/${c}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-accent hover:underline">
          {/* the full label does not fit two abreast on a phone: the two links ran into one another */}
          <span className="sm:hidden">BrokerCheck</span><span className="hidden sm:inline">BrokerCheck record</span><Icon name="ext" size={12} /></a>
      : <span className="text-muted">not found yet</span>;
  };
  const sipc = (F: Firm) => {
    const v = d.fees[F.id]?.sipc;
    return v == null ? <span className="text-muted">not checked</span> : <Status kind={v ? "good" : "bad"}>{v ? "Yes" : "No"}</Status>;
  };
  const yesNo = (v: boolean) => <Status kind={v ? "good" : "neutral"}>{v ? "Yes" : "No"}</Status>;
  const groups: Group[] = [
    {
      title: "Prices you get", sub: `${monthLong(f.month)} · ${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot]} orders`,
      rows: [
        fill("cost10k"),
        fill("cust"),
        fill("gap", (v) => (v == null ? "–" : `${signed(v, 1)} pt`), "not enough data"),
        fill("speed"),
        fill("pay10k", undefined, "not reported"),
        fill("pi"),
        fill("sz"),
      ],
    },
    {
      title: "Fees", sub: checked.length ? `checked ${checked.map((c) => dayLong(c)).join(" and ")}` : "not checked yet",
      rows: [
        fill("commission", undefined, "not confirmed"),
        fill("optionsFee", undefined, feeNa("optionsFee")),
        fill("marginRate", undefined, "not confirmed"),
        fill("cashYield", undefined, "not confirmed"),
        { key: "transferOut", label: "Transfer-out fee", info: "For moving your whole account to another broker. Lower is better.",
          better: "low", av: rA.transferOut, bv: rB.transferOut, fmt: usd2, na: "not confirmed" },
      ],
    },
    {
      title: "Is it registered?", sub: "regulator records, not an endorsement",
      rows: [
        { key: "crd", label: "FINRA record", a: brokerCheck(A), b: brokerCheck(B),
          info: "BrokerCheck: the broker's licences, history and any disciplinary actions." },
        { key: "sipc", label: "SIPC member", a: sipc(A), b: sipc(B),
          info: "Returns your securities and cash (up to $500,000) if the broker fails; not investment losses." },
        { key: "606", label: "Reports what it is paid for orders", a: yesNo(files606(d, A.crd)), b: yesNo(files606(d, B.crd)),
          info: "Rule 606: where a broker sends orders and what it is paid. A broker whose orders go through another firm files none." },
      ],
    },
  ];
  // on a phone each row stacks: the label on its own line, the two values under it with the broker's colour dot (see ROW)
  const dot = (side: "a" | "b") => <span className="mr-1.5 inline-block h-2 w-2 rounded-[2px] align-[1px] sm:hidden" style={{ background: t.s[side === "a" ? 0 : 1] }} aria-hidden="true" />;
  const cell = (r: Row, side: "a" | "b") => {
    // values never wrap: the columns grow to fit them and the label column takes what is left
    const cls = `whitespace-nowrap px-2 py-2.5 align-middle max-sm:pt-0 ${side === "a" ? "max-sm:text-left" : "text-right"}`;
    if (!r.fmt) return <td key={side} className={`${cls} text-[13.5px] text-ink`}>{dot(side)}{side === "a" ? r.a : r.b}</td>;
    const v = (side === "a" ? r.av : r.bv) ?? null;
    const win = winner(r.better ?? null, r.av ?? null, r.bv ?? null) === side;
    const na = Array.isArray(r.na) ? r.na[side === "a" ? 0 : 1] : r.na;
    return (
      <td key={side} className={`tnum ${cls} text-[14px] ${win ? "font-bold text-better" : "text-ink"}`}>
        {dot(side)}
        {v == null ? <span className="font-normal text-muted">{na ?? "–"}</span>
          : <>{win && <><span className="sr-only">better: </span><Icon name="check" size={13} className="mr-1 inline-block align-[-1px]" /></>}{r.fmt(v)}</>}
      </td>
    );
  };
  const head = (F: Firm, i: number) => (
    <th scope="col" className={`px-2 py-2 text-right sm:w-[22%] ${i === 0 ? "max-sm:text-left" : ""}`}>
      <a href={href(brokerPath(F.slug))} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink hover:text-accent">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.s[i] }} aria-hidden="true" />{F.short}
      </a>
    </th>
  );
  // phone layout: the table becomes blocks and each row a two-column grid, the label spanning both columns
  const ROW = "max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3";

  // ---------- cost by order size: both brokers across the 605 size buckets ----------
  const bySize = [A, B].map((F, i) => ({
    name: F.short, color: t.s[i],
    values: SIZE_STEPS.map((bk) => {
      const e = d.exec.get(execKey(F.id, f.month, f.sp, f.ot, bk));
      if (e?.efq == null) return null;
      // dollars above the midpoint on a $10,000 trade (share of the spread × half the quoted spread), or the share itself
      return unit === "usd" ? (e.qs == null ? null : e.efq * e.qs * 5000) : e.efq * 100;
    }),
  }));
  const hasSize = bySize.some((sr) => sr.values.some((v) => v != null));
  const sizeChart = useMemo(() => lines(t, SIZE_STEPS.map((bk) => SIZE_SHORT[bk]), bySize,
    { fmt: unit === "usd" ? (v) => usd2(v) : (v) => `${v.toFixed(0)}%` }), [t, A, B, f, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  // every pair of retail brokers, each once, in the order its page shows it: sorted by slug, so each broker pairs with the ones after it
  const retail = [...d.brokers].sort((x, y) => (x.slug < y.slug ? -1 : x.slug > y.slug ? 1 : 0));
  const pairCount = (retail.length * (retail.length - 1)) / 2;
  const isCurrent = (x: Firm, y: Firm) => (x.id === A.id && y.id === B.id) || (x.id === B.id && y.id === A.id);

  return (
    <div className="rise">
      <PageHeader eyebrow="Compare" title={explicit ? `${A.short} vs ${B.short}` : "Compare two brokers"}
        sub={<>
          {!explicit && (
            <span className="mb-1 block font-semibold text-ink">
              Showing <a href={href(comparePath(A.slug, B.slug))} className="text-accent hover:underline">{A.short} vs {B.short}</a>; pick any two above.
            </span>
          )}
          Prices, payments, fees and registration, side by side.
        </>}
        right={
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:w-auto sm:grid-cols-[190px_auto_190px]">
            <Select label="First broker" value={A.id} onChange={(v) => go(comparePath(slugOf(d, v), B.slug))} options={opts} full />
            <button type="button" onClick={() => setSwapped(!swapped)} aria-label="Swap the two brokers" title="Swap"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink2 hover:border-accent hover:text-ink">
              <Icon name="swap" size={18} />
            </button>
            <Select label="Second broker" value={B.id} onChange={(v) => go(comparePath(A.slug, slugOf(d, v)))} options={opts} full />
          </div>
        } />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot"]} />

      {A.id === B.id && (
        <div className="mb-5 rounded-xl border border-line bg-surface2 px-4 py-3 text-[13.5px] text-ink2">
          Same broker twice: pick a different one in either box.
        </div>
      )}

      <Verdict f={f} A={A} B={B} rA={rA} rB={rB} feeA={feeA} feeB={feeB} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card title="Side by side" sub="Tap a name for its report"
          foot={<>Tick = the better value; unticked rows are context, not a score.
            Prices: {monthLong(f.month)} (SEC Rule 605), orders under $200,000. Payment: {quarterLong(f.quarter)} (SEC Rule 606).
            {" "}<a href={href(pagePath("how-we-measure"))} className="font-semibold text-accent hover:underline">How we measure</a></>}>
          <table className="w-full border-collapse max-sm:block">
            <caption className="sr-only">{A.short} and {B.short} side by side</caption>
            <thead className="max-sm:block">
              <tr className={`border-b border-line ${ROW}`}>
                <th scope="col" className="py-2 pr-2 text-left text-[12px] font-semibold uppercase tracking-wider text-muted max-sm:hidden">Measure</th>
                {head(A, 0)}{head(B, 1)}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title} className="max-sm:block">
                <tr className="max-sm:block">
                  <th colSpan={3} scope="rowgroup" className="pb-1.5 pt-5 text-left text-[12px] font-semibold uppercase tracking-wider text-muted max-sm:block">
                    {g.title}{g.sub && <span className="ml-2 font-normal normal-case tracking-normal">{g.sub}</span>}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.key} className={`border-t border-line ${ROW}`}>
                    <th scope="row" className="py-2.5 pr-2 text-left text-[13.5px] font-medium leading-snug text-ink2 max-sm:col-span-2 max-sm:pb-1">
                      {/* the info icon stays glued to the last word, so it never sits alone on a line */}
                      {r.label.slice(0, r.label.lastIndexOf(" ") + 1)}
                      <span className="whitespace-nowrap">{r.label.slice(r.label.lastIndexOf(" ") + 1)}{r.info && <> <Info>{r.info}</Info></>}</span>
                    </th>
                    {cell(r, "a")}{cell(r, "b")}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Cost by order size" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot]} orders`}
            right={<Segmented size="sm" label="Unit" value={unit} onChange={setUnit} options={[["usd", "$ on $10,000"], ["pct", "% of spread"]]} />}
            foot="Every broker gets far worse prices on orders of $200,000 and over.">
            {hasSize ? (
              <>
                <EChart option={sizeChart} height={300} label={`Cost by order size, ${A.short} vs ${B.short}`} />
                <ChartTable head={["Order size", A.short, B.short]}
                  rows={SIZE_STEPS.map((bk, i) => [SIZE_SHORT[bk], ...bySize.map((sr) => (sr.values[i] == null ? "–" : unit === "usd" ? usd2(sr.values[i]) : `${sr.values[i]!.toFixed(0)}%`))])} />
              </>
            ) : <Empty>No price data with these filters.</Empty>}
          </Card>

          <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-card sm:p-7" style={{ background: "var(--grad)" }}>
            <h2 className="font-display text-[22px] font-extrabold tracking-tight">What does this add up to in a year?</h2>
            <a href={`${href(pagePath("calculator"))}?b=${A.slug}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1b2a55] hover:bg-white/90">
              See your yearly cost<Icon name="arrow" size={15} />
            </a>
          </div>

          <Card title="Popular comparisons">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {POPULAR.filter(([x, y]) => d.byId[x] && d.byId[y]).map(([x, y]) => pairOrder(d.byId[x], d.byId[y])).map(([x, y]) => {
                const cur = isCurrent(x, y);
                return (
                  <a key={`${x.id}-${y.id}`} href={href(comparePath(x.slug, y.slug))} aria-current={cur ? "page" : undefined}
                    className={`rounded-xl border px-3 py-2.5 text-[13.5px] font-medium transition-colors ${cur ? "border-accent bg-[var(--accent-soft)] text-ink" : "border-line bg-surface2 text-ink2 hover:border-accent hover:text-ink"}`}>
                    {x.short} <span className="text-muted">vs</span> {y.short}
                  </a>
                );
              })}
            </div>
            {/* every pair has a page of its own; the list is collapsed but always on the page, so each one can be found and linked */}
            <details className="group mt-3">
              <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                <Icon name="right" size={14} className="transition-transform group-open:rotate-90" />Every comparison ({pairCount} pairs)
              </summary>
              <div className="mt-2 space-y-2 text-[13px] leading-relaxed">
                {retail.slice(0, -1).map((x, i) => (
                  <div key={x.id}>
                    <span className="font-semibold text-ink">{x.short}</span> <span className="text-muted">vs</span>{" "}
                    {retail.slice(i + 1).map((y, j) => (
                      <Fragment key={y.id}>
                        {j > 0 && <span className="text-muted"> · </span>}
                        <a href={href(comparePath(x.slug, y.slug))} aria-current={isCurrent(x, y) ? "page" : undefined}
                          className={isCurrent(x, y) ? "font-semibold text-ink" : "text-accent hover:underline"}>{y.short}</a>
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
