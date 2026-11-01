// #/compare/<A>/<B>: two brokers side by side in plain words: what a $10,000 trade costs at each, what each is paid
// for the order, its fees and its regulator records. Defaults to Robinhood vs Fidelity; unknown ids fall back to those.
import { useMemo, useState, type ReactNode } from "react";
import { EChart } from "../charts/EChart";
import { lines } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { Card, ChartTable, Empty, Icon, Info, PageHeader, Segmented, Select, Status } from "../components/ui";
import { execKey, files606, metric, nameOf, OT_LABEL, SIZE_STEPS, SP_LABEL, type Data, type Fee, type Filters, type Firm, type Metric } from "../lib/data";
import { dayLong, monthLong, quarterLong, signed, usd2 } from "../lib/format";
import { go } from "../lib/hooks";
import { METRICS, type MetricKey } from "../lib/metrics";
import { useTheme } from "../lib/theme";

const DEFAULTS = ["HOOD", "FIBS"];
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

/** "a fill $0.10 better than the fair price" or "$0.95 above the fair price" */
const fair = (v: number) => (v < 0 ? `a fill ${usd2(-v)} better than the fair price` : `${usd2(v)} above the fair price`);

/** The short answer, generated from the numbers: who is cheaper on a $10,000 trade, by how much, and whether fees change it. */
function Verdict({ f, A, B, rA, rB, feeA, feeB }: { f: Filters; A: Firm; B: Firm; rA: Metric; rB: Metric; feeA?: Fee; feeB?: Fee }) {
  const stocks = f.sp === "Y" ? "big-company (S&P 500) stocks" : "stocks outside the S&P 500";
  const order = f.ot === "M" ? "market order" : "marketable limit order";
  const price: ReactNode[] = [], money: ReactNode[] = [];

  // 1. the fill
  const diff = rA.cost10k != null && rB.cost10k != null ? rA.cost10k - rB.cost10k : null; // > 0: B is cheaper
  let cheap: Firm | null = null;
  if (diff == null) {
    price.push(<>{rA.cost10k == null ? A.short : B.short} has no Rule 605 fill data for {monthLong(f.month)}, so the two can't be compared on price yet.</>);
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
    if (Math.abs(g) < 1) price.push(<> On the exact same stocks and order sizes the two are level.</>);
    else {
      const same = g > 0 ? B : A;
      price.push(cheap == null || same.id === cheap.id
        ? <> That holds on identical trades too: on the exact same stocks and order sizes, {same.short} gets the better price.</>
        : <> On the exact same stocks and order sizes, though, {same.short} comes out ahead, so part of the headline difference is what each broker's customers trade rather than how well they are filled.</>);
    }
  }

  // 3. what the broker is paid
  const pa = rA.pay10k, pb = rB.pay10k;
  const paid = (F: Firm, v: number | null) =>
    v == null ? `${F.short} doesn't publish what it is paid for orders`
      : v > 0.005 ? `${F.short} is paid about ${usd2(v)} per $10,000 order by the trading firms that fill it`
      : v < -0.005 ? `${F.short} pays its trading firm about ${usd2(-v)} per $10,000 order`
      : `${F.short} isn't paid for sending orders`;
  if (pa != null && pb != null && pa > 0.005 && pb > 0.005) {
    money.push(<>Trading firms pay {A.short} about {usd2(pa)} and {B.short} about {usd2(pb)} for every $10,000 order sent their way.</>);
  } else {
    money.push(<>{paid(A, pa)}; {paid(B, pb)}.</>);
  }

  // 4. do fees change the picture?
  const ca = feeA?.commission ?? null, cb = feeB?.commission ?? null;
  if (ca != null && cb != null) {
    if (ca === cb) {
      money.push(ca === 0
        ? <> Neither charges a commission on stock trades, so the price of the fill is the whole cost of a trade.</>
        : <> Both charge {usd2(ca)} commission per stock trade, so that doesn't separate them.</>);
    } else {
      const hi = ca > cb ? A : B, lo = ca > cb ? B : A, gap = Math.abs(ca - cb);
      money.push(<> Fees change the picture: {hi.short} charges {usd2(Math.max(ca, cb))} commission per stock trade and {lo.short} {usd2(Math.min(ca, cb))}, a difference that {diff != null && gap > Math.abs(diff) ? "outweighs" : "is smaller than"} the fill difference per $10,000 traded.</>);
    }
  } else {
    const unknown = [ca == null ? A.short : null, cb == null ? B.short : null].filter(Boolean).join(" and ");
    money.push(<> We haven't verified {unknown}'s stock commission yet, so fees could still change the picture.</>);
  }
  const oa = feeA?.optionsFee ?? null, ob = feeB?.optionsFee ?? null;
  if (oa != null && ob != null && oa !== ob) {
    money.push(<> For options, {oa < ob ? A.short : B.short} charges less ({usd2(Math.min(oa, ob))} against {usd2(Math.max(oa, ob))} per contract); these reports don't measure options fills at all.</>);
  }

  return (
    <Card title="The short answer" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot]} orders · averaged over all order sizes under $200,000`}>
      <p className="text-[15.5px] leading-relaxed text-ink2">{price}</p>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink2">{money}</p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
        This isn't a verdict on which broker is better overall: that also depends on what you trade, the interest you earn on cash, the app and the support.
        The <a href="#/calculator" className="font-semibold text-accent hover:underline">yearly cost calculator</a> puts numbers on your own trading habits.
      </p>
    </Card>
  );
}

export default function Compare({ d, f, set, a, b }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; a: string; b: string }) {
  const { t } = useTheme();
  const A = d.byId[a] ?? d.byId[DEFAULTS[0]] ?? d.brokers[0];
  const B = d.byId[b] ?? d.byId[DEFAULTS[1]] ?? d.brokers[1];
  const s: Filters = { ...f, b: 199999 }; // headline numbers: all orders under $200,000, whatever size the explorer last used
  const rA = metric(d, A, s), rB = metric(d, B, s);
  const feeA: Fee | undefined = d.fees[A.id], feeB: Fee | undefined = d.fees[B.id];
  const order = [...d.firms].sort((x, y) => x.short.localeCompare(y.short));
  const opts: [string, string][] = order.map((o) => [o.id, nameOf(o)]);
  const [unit, setUnit] = useState<"usd" | "pct">("usd");

  // ---------- the side-by-side table ----------
  const fill = (k: MetricKey, fmt = METRICS[k].fmt, na?: Row["na"]): Row =>
    ({ key: k, label: METRICS[k].label, info: METRICS[k].desc, better: METRICS[k].better, av: METRICS[k].get(rA), bv: METRICS[k].get(rB), fmt, na });
  // a fee is "not offered" when the broker has no such product at all (no options trading), "not available" when nobody has checked it
  const feeNa = (k: "optionsFee"): [string, string] => [feeA, feeB].map((x) => (x?.notOffered.includes(k) ? "not offered" : "not available")) as [string, string];
  const checked = [...new Set([feeA, feeB].filter((x): x is Fee => !!x).map((x) => x.checked))];
  const crd = (F: Firm) => d.fees[F.id]?.crd ?? F.crd ?? null; // the account's broker-dealer first; the 606 CRD can be a routing affiliate
  const brokerCheck = (F: Firm) => {
    const c = crd(F);
    return c
      ? <a href={`https://brokercheck.finra.org/firm/summary/${c}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-accent hover:underline">CRD {c}<Icon name="ext" size={12} /></a>
      : <span className="text-muted">not on file</span>;
  };
  const sipc = (F: Firm) => {
    const v = d.fees[F.id]?.sipc;
    return v == null ? <span className="text-muted">not checked</span> : <Status kind={v ? "good" : "bad"}>{v ? "Yes" : "No"}</Status>;
  };
  const yesNo = (v: boolean) => <Status kind={v ? "good" : "neutral"}>{v ? "Yes" : "No"}</Status>;
  const groups: Group[] = [
    {
      title: "Fills", sub: `${monthLong(f.month)} · ${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot]} orders`,
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
      title: "Fees", sub: checked.length ? `checked ${checked.map((c) => dayLong(c)).join(" and ")} on the brokers' own pages` : "not checked yet",
      rows: [
        fill("commission", undefined, "not available"),
        fill("optionsFee", undefined, feeNa("optionsFee")),
        fill("marginRate", undefined, "not available"),
        fill("cashYield", undefined, "not available"),
        { key: "transferOut", label: "Fee to move your account elsewhere", info: "Dollars charged for a full transfer of your account to another broker. Lower is better.",
          better: "low", av: rA.transferOut, bv: rB.transferOut, fmt: usd2, na: "not available" },
      ],
    },
    {
      title: "Is it registered?", sub: "regulator records, not an endorsement",
      rows: [
        { key: "crd", label: "FINRA record", a: brokerCheck(A), b: brokerCheck(B),
          info: "Every US broker has a number (CRD) in FINRA's BrokerCheck, which lists its licences, history and any disciplinary actions. The link opens its record." },
        { key: "sipc", label: "SIPC member", a: sipc(A), b: sipc(B),
          info: "SIPC protection returns your securities and cash (up to $500,000) if the broker itself fails. It does not cover investment losses." },
        { key: "606", label: "Publishes what it is paid for orders", a: yesNo(files606(d, A.crd)), b: yesNo(files606(d, B.crd)),
          info: "A Rule 606 report shows where a broker sends orders and what it is paid for them. Brokers that hand all their orders to another firm may not file one." },
        { key: "605", label: "Rule 605 code", a: <span className="font-mono text-[13px]">{A.id}</span>, b: <span className="font-mono text-[13px]">{B.id}</span>,
          info: "The code the broker files its monthly execution quality report under. The fills above come from that report." },
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
      <a href={`#/broker/${F.id}`} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink hover:text-accent">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.s[i] }} aria-hidden="true" />{F.short}
      </a>
    </th>
  );
  // phone layout: the table becomes blocks and each row a two-column grid, the label spanning both columns
  const ROW = "max-sm:grid max-sm:grid-cols-2";

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

  return (
    <div className="rise">
      <PageHeader eyebrow="Compare" title={`${A.short} vs ${B.short}`}
        sub="Two brokers side by side: what a trade really costs, what each is paid for your order, its fees and whether it's registered. All from the reports brokers must publish by law."
        right={
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:w-auto sm:grid-cols-[190px_auto_190px]">
            <Select label="First broker" value={A.id} onChange={(v) => go(`compare/${v}/${B.id}`)} options={opts} full />
            <button type="button" onClick={() => go(`compare/${B.id}/${A.id}`)} aria-label="Swap the two brokers" title="Swap"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink2 hover:border-accent hover:text-ink">
              <Icon name="swap" size={18} />
            </button>
            <Select label="Second broker" value={B.id} onChange={(v) => go(`compare/${A.id}/${v}`)} options={opts} full />
          </div>
        } />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot"]} />

      {A.id === B.id && (
        <div className="mb-5 rounded-xl border border-line bg-surface2 px-4 py-3 text-[13.5px] text-ink2">
          That's the same broker twice. Pick a different one in either box to compare.
        </div>
      )}

      <Verdict f={f} A={A} B={B} rA={rA} rB={rB} feeA={feeA} feeB={feeB} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card title="Side by side" sub="Tap a broker's name for its full report"
          foot={<>A tick marks the better value where there is a clear better direction; measures with no tick (speed, payment, order size, price-improved) are context, not a score.
            Registration facts are not an endorsement: a registered broker can still give poor fills.
            Fills: Rule 605 report for {monthLong(f.month)}, all orders under $200,000. Payment: Rule 606 report for {quarterLong(f.quarter)}.</>}>
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
          <Card title="Cost by order size" sub={`${SP_LABEL[f.sp]} · ${OT_LABEL[f.ot]} orders · from the smallest orders to the largest`}
            right={<Segmented size="sm" label="Unit" value={unit} onChange={setUnit} options={[["usd", "$ on $10,000"], ["pct", "% of spread"]]} />}
            foot="Most people's trades sit in the first three or four buckets. Orders of $200,000 and over are a different market: every broker's fills are far worse there.">
            {hasSize ? (
              <>
                <EChart option={sizeChart} height={300} label={`Cost by order size, ${A.short} vs ${B.short}`} />
                <ChartTable head={["Order size", A.short, B.short]}
                  rows={SIZE_STEPS.map((bk, i) => [SIZE_SHORT[bk], ...bySize.map((sr) => (sr.values[i] == null ? "–" : unit === "usd" ? usd2(sr.values[i]) : `${sr.values[i]!.toFixed(0)}%`))])} />
              </>
            ) : <Empty>No fill data for these two brokers under the current filters.</Empty>}
          </Card>

          <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-card sm:p-7" style={{ background: "var(--grad)" }}>
            <h2 className="font-display text-[22px] font-extrabold tracking-tight">What does this add up to in a year?</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/85">
              Tell the calculator how often you trade and how much, and see the yearly cost at {A.short}, {B.short} and every other broker.
            </p>
            <a href={`#/calculator?b=${A.id}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1b2a55] hover:bg-white/90">
              See your yearly cost<Icon name="arrow" size={15} />
            </a>
          </div>

          <Card title="Popular comparisons" sub="Tap a pair to compare it">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {POPULAR.map(([x, y]) => {
                const cur = (x === A.id && y === B.id) || (x === B.id && y === A.id);
                return (
                  <a key={`${x}-${y}`} href={`#/compare/${x}/${y}`} aria-current={cur ? "page" : undefined}
                    className={`rounded-xl border px-3 py-2.5 text-[13.5px] font-medium transition-colors ${cur ? "border-accent bg-[var(--accent-soft)] text-ink" : "border-line bg-surface2 text-ink2 hover:border-accent hover:text-ink"}`}>
                    {d.byId[x]?.short ?? x} <span className="text-muted">vs</span> {d.byId[y]?.short ?? y}
                  </a>
                );
              })}
            </div>
            <div className="mt-3 text-[12.5px] text-muted">Or pick any two brokers in the boxes at the top.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
