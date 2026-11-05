import { useEffect, useMemo, useRef, useState } from "react";
import { EChart } from "../charts/EChart";
import { divergingBars, donut, heatmap, lines, stackedColumns } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { Card, Empty, Icon, Kpi, PageHeader, Segmented } from "../components/ui";
import { files606, SP_LABEL, type Data, type Filters, type Firm } from "../lib/data";
import { cents, dollars, monthLong, pct, quarterLong, quarterShort } from "../lib/format";
import { go, onNavigate } from "../lib/hooks";
import { brokerPath, href } from "../lib/routes";
import { useTheme } from "../lib/theme";

const trim = (n: string) => n.replace(/ (Securities|Americas|Financial|Execution|Services|LLC)$/, "");

/** The broker a "By broker" section opens on before the address names one: Robinhood, the most looked-up. */
const FIRST = "HOOD";

/** One broker's orders and payments (moved here from its broker page, whose payment line links to it as
 *  trading-firms/#<slug>): where its orders go, its payment rate over time and the dollars it is paid per quarter. */
function ByBroker({ d, f, firm }: { d: Data; f: Filters; firm: Firm }) {
  const { t } = useTheme();
  const has606 = files606(d, firm.crd); // a CRD alone is not a 606: five brokers have one without filing

  // routing: where its orders go (top 6 + other). On the latest quarter a broker that hasn't filed it yet shows the quarter
  // before, named as such (the same fallback as its payment on the broker page)
  const routed = (q: string | undefined) => (q ? d.venues.filter((v) => v.crd === firm.crd && v.q === q && v.sp === f.sp) : []);
  const prevQ = d.meta.quarters[d.meta.quarters.indexOf(f.quarter) - 1];
  const late = f.quarter === d.meta.quarter && !routed(f.quarter).length && routed(prevQ).length > 0;
  const routeQ = late ? prevQ : f.quarter;
  const venues = routed(routeQ)
    .map((v) => ({ venue: v.venue, share: v.share[f.ot] ?? 0, cph: v.cph[f.ot] })).filter((v) => v.share > 0).sort((a, b) => b.share - a.share);
  const head = venues.slice(0, 6), tail = venues.slice(6);
  const slices = [
    ...head.map((v, i) => ({ name: v.venue, v: v.share, color: t.s[i], rows: [[t.s[i], "Share of orders", pct(v.share, 1)], [null, "Paid per 100 shares", cents(v.cph)]] as [string | null, string, string][] })),
    ...(tail.length ? [{ name: `Other (${tail.length})`, v: tail.reduce((a, v) => a + v.share, 0), color: t.context }] : []),
  ];
  // some 606s list only their main venues (Futu Clearing: ~56%); show the rest rather than stretch the ring
  const listed = venues.reduce((a, v) => a + v.share, 0);
  if (venues.length && listed < 97) slices.push({ name: "Not broken down", v: 100 - listed, color: t.neutral });
  const routing = useMemo(() => donut(t, slices, (v) => `${v.toFixed(0)}%`), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  // payments over time, anchored at zero on whichever side they are: most brokers are paid, a few pay their trading firm
  const qs = d.meta.quarters;
  const hist = qs.map((q) => (firm.crd ? d.pay.get(`${firm.crd}|${q}|${f.sp}`)?.[f.ot] ?? null : null));
  const known = hist.filter((v): v is number => v != null);
  const anchor = { min: known.some((v) => v < 0) ? undefined : 0, max: known.some((v) => v > 0) ? undefined : 0 };
  const histChart = useMemo(() => lines(t, qs.map(quarterShort), [{ name: "Paid per 100 shares", values: hist, color: t.s[0] }],
    { fmt: (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}¢`, area: false, ...anchor }), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps
  const segs = [["SP500", "S&P 500", t.s[0]], ["OtherStocks", "Other stocks", t.s[1]], ["Options", "Options", t.s[2]]] as const;
  const usd = segs.map(([k, name, color]) => ({ name, color, values: qs.map((q) => d.usd.filter((u) => u.crd === firm.crd && u.q === q && u.seg === k).reduce((a, u) => a + Math.max(0, u.usd), 0)) }));
  const usdTotal = usd.reduce((a, s) => a + s.values.reduce((x, y) => x + y, 0), 0);
  const paysOut = d.usd.some((u) => u.crd === firm.crd && u.usd < 0); // it pays its trading firm (Cash App)
  const usdChart = useMemo(() => stackedColumns(t, qs.map(quarterShort), usd, dollars), [t, firm]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!has606) {
    return <Empty><span className="px-6">{firm.short} files no payment report of its own (another firm routes its orders).</span></Empty>;
  }
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">Where its orders go</h3>
        <p className="mb-2 text-[13px] text-muted">By trading firm · {SP_LABEL[f.sp]} · {quarterLong(routeQ)}{late && ", the latest it has filed"}</p>
        {slices.length ? <EChart option={routing} height={300} label={`Where ${firm.short}'s orders go`} />
          : <Empty><span className="px-6">No routing reported for {quarterLong(routeQ)}.</span></Empty>}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-ink">Payment rate over time</h3>
        <p className="mb-2 text-[13px] text-muted">Cents per 100 shares, averaged across its trading firms</p>
        {hist.some((v) => v != null) ? <EChart option={histChart} height={300} label={`${firm.short}'s payment rate`} />
          : <Empty><span className="px-6">No rate reported.</span></Empty>}
      </div>
      <div className="lg:col-span-2">
        <h3 className="text-[15px] font-semibold text-ink">Paid, by type of trade</h3>
        <p className="mb-2 text-[13px] text-muted">Dollars per quarter (SEC Rule 606)</p>
        {usdTotal > 0 ? <EChart option={usdChart} height={280} label={`Payments to ${firm.short} per quarter`} />
          : <Empty><span className="px-6">{paysOut ? `${firm.short} pays its trading firm rather than being paid, so it received nothing.` : "No dollar amounts reported."}</span></Empty>}
      </div>
    </div>
  );
}

export default function MarketMakers({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const { t } = useTheme();
  const [metric, setMetric] = useState<"share" | "pay">("share");
  const mmName = Object.fromEntries(d.marketMakers.map((m) => [m.id, m.name]));

  // price quality on the same stock x lot x size cells
  const gaps = d.sameStock.marketMakers.filter((g) => g.sp === f.sp).sort((a, b) => a.gap - b.gap);
  const missing = d.marketMakers.filter((m) => !gaps.some((g) => g.id === m.id));
  const gapChart = useMemo(() => divergingBars(t, gaps.map((g) => ({
    id: g.id, name: trim(mmName[g.id] ?? g.id), v: g.gap,
    rows: [[null, "Its customers pay", pct(g.own, 1)], [null, "Other firms, same trades", pct(g.peers, 1)], [null, "Trades matched", g.cells.toLocaleString()]],
  })), { unit: " pts" }), [t, gaps]); // eslint-disable-line react-hooks/exhaustive-deps

  // FINRA off-exchange volume share; the quarter still in progress is left out (it would look like a crash)
  const built = new Date(d.meta.built);
  const current = `${built.getFullYear()}Q${Math.floor(built.getMonth() / 3) + 1}`;
  const qs = [...new Set(d.otc.map((o) => o.q))].filter((q) => q < current).sort();
  const lastQ = qs[qs.length - 1];
  const shareIn = (firm: string) => d.otc.find((o) => o.firm === firm && o.q === lastQ)?.share ?? 0;
  const firms = [...new Set(d.otc.map((o) => o.firm))].sort((a, b) => shareIn(b) - shareIn(a));
  const otcChart = useMemo(() => lines(t, qs.map(quarterShort), firms.map((name, i) => ({
    name: trim(name), color: t.s[i % 8], values: qs.map((q) => d.otc.find((o) => o.firm === name && o.q === q)?.share ?? null),
  })), { fmt: (v) => `${v.toFixed(0)}%`, endLabels: true, min: 0 }), [t, d]); // eslint-disable-line react-hooks/exhaustive-deps
  const lead = firms[0], leadShare = lead ? shareIn(lead) : null;

  // routing matrix: brokers x trading firms
  const brokers = d.firms.filter((b) => b.crd && (f.clearing || b.type !== "clearing_firm"));
  const rows = d.venues.filter((v) => v.q === f.quarter && v.sp === f.sp && brokers.some((b) => b.crd === v.crd));
  const tot = new Map<string, number>();
  rows.forEach((v) => tot.set(v.venue, (tot.get(v.venue) ?? 0) + (v.share[f.ot] ?? 0)));
  const top = [...tot].filter(([, s]) => s >= 15).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([v]) => v);
  const cols = metric === "share" && tot.size > top.length ? [...top, "Other"] : top;
  const brs = brokers.filter((b) => rows.some((v) => v.crd === b.crd && (v.share[f.ot] ?? 0) > 0));
  // cents per 100 shares this broker is paid by this firm (null when it sends the firm nothing)
  const rate = (crd: string | null, venue: string) => {
    const v = rows.find((r) => r.crd === crd && r.venue === venue);
    return v && (v.share[f.ot] ?? 0) > 0 ? v.cph[f.ot] : null;
  };
  const cell = (crd: string | null, venue: string) => {
    if (metric === "pay") return rate(crd, venue);
    const vs = rows.filter((v) => v.crd === crd && (venue === "Other" ? !top.includes(v.venue) : v.venue === venue));
    return vs.length ? vs.reduce((a, v) => a + (v.share[f.ot] ?? 0), 0) : null;
  };
  const cells: [number, number, number | null][] = brs.flatMap((b, y) => cols.map((c, x) => [x, y, cell(b.crd, c)] as [number, number, number | null]));
  const heat = useMemo(() => heatmap(t, brs.map((b) => b.short), cols.map(trim), cells,
    { fmt: metric === "share" ? (v) => `${v.toFixed(0)}%` : (v) => `${v.toFixed(0)}¢`, label: metric, rowIds: brs.map((b) => b.id) }),
  [t, f, metric]); // eslint-disable-line react-hooks/exhaustive-deps
  // read across a row: brokers paid one rate (within a cent) by every firm shown vs brokers whose rate differs by firm
  const paid = brs.map((b) => top.map((c) => rate(b.crd, c)).filter((v): v is number => v != null)).filter((r) => r.length >= 2);
  const oneRate = paid.filter((r) => Math.max(...r) - Math.min(...r) <= 1).length;
  const negative = paid.some((r) => r.some((v) => v < 0));

  // "By broker": one section, one anchor per broker (trading-firms/#robinhood, which a broker page's payment line links to).
  // The first render is the pre-rendered one (the default broker); the address's hash is read once the page is live,
  // and again whenever it changes (a pick below, Back, another broker page's link while this page is open).
  const brokerList = useMemo(() => [...d.firms].sort((a, b) => a.short.localeCompare(b.short)), [d]);
  const [pick, setPick] = useState<string>(() => d.byId[FIRST]?.slug ?? brokerList[0]?.slug ?? "");
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const read = (scroll: boolean) => {
      let slug = location.hash.slice(1);
      try { slug = decodeURIComponent(slug); } catch { /* a malformed hash names no broker */ }
      if (!d.bySlug[slug]) return;
      setPick(slug);
      if (scroll) section.current?.scrollIntoView({ block: "start" });
    };
    read(true);
    const onHash = () => read(true);
    addEventListener("hashchange", onHash);
    const off = onNavigate(() => read(true));
    return () => { removeEventListener("hashchange", onHash); off(); };
  }, [d]);
  const picked = d.bySlug[pick] ?? brokerList[0];

  return (
    <div className="rise">
      <PageHeader title="Who fills your order?"
        intro="A handful of trading firms (market makers) fill most retail orders and set the price you get." />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "quarter", "clearing"]} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Trading firms used" value={tot.size} sub={`by brokers here, ${quarterLong(f.quarter)}`} />
        <Kpi label="Trading firms compared" value={gaps.length} sub={`on the same ${SP_LABEL[f.sp]} stocks and sizes, ${monthLong(d.meta.detailMonth)}`} />
        <Kpi label={`Biggest by volume, ${lastQ ? quarterShort(lastQ) : ""}`} value={leadShare != null ? pct(leadShare, 0) : "–"}
          sub={lead ? `${trim(lead)}'s off-exchange share` : undefined} />
      </section>

      <Card className="mt-5" title="Who sends orders where" sub={`${SP_LABEL[f.sp]} · ${quarterLong(f.quarter)} · ${metric === "share" ? "share of orders" : "cents per 100 shares"} · click a broker`}
        right={<Segmented size="sm" label="Show" value={metric} onChange={setMetric} options={[["share", "Share of orders"], ["pay", "Payment rate"]]} />}
        foot={metric === "pay" && paid.length > 0 ? <>{oneRate} of {paid.length} brokers are paid one rate (within a cent) by every firm; {paid.length - oneRate} are paid different rates.{negative && " Below zero: the broker paid the firm."}</> : undefined}>
        {brs.length ? <EChart option={heat} height={brs.length * 34 + 160} label="Routing by broker and trading firm"
          onClick={(p) => { const y = p.data?.value?.[1]; if (y != null && brs[y]) go(brokerPath(brs[y].slug)); }} /> : <Empty>No routing reports this quarter.</Empty>}
      </Card>

      {missing.length > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4 text-[13.5px] text-ink2">
          <Icon name="info" size={18} className="mt-0.5 text-[var(--warning)]" />
          <span><b className="text-ink">{missing.map((m) => trim(m.name) + (m.name === lead ? " (biggest by volume)" : "")).join(", ")}:</b> no detailed report for {monthLong(d.meta.detailMonth)} yet.</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Price quality on the same stocks" sub={`${SP_LABEL[f.sp]} · market orders · points of the spread vs other firms`}
          info="A trading firm's score mixes its own pricing with the brokers that send it orders.">
          {gaps.length ? <EChart option={gapChart} height={Math.max(260, gaps.length * 40 + 40)} label="Price quality on the same stocks and order sizes" /> : <Empty>No reports this month.</Empty>}
        </Card>
        <Card title="Share of off-exchange stock trading" sub="FINRA volume data · full quarters">
          {qs.length ? <EChart option={otcChart} height={Math.max(260, gaps.length * 40 + 40)} label="Off-exchange share by quarter" /> : <Empty>No FINRA data.</Empty>}
        </Card>
      </div>

      <section ref={section} aria-labelledby="by-broker-h" className="mt-5 scroll-mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:scroll-mt-24 sm:p-6">
        {/* one anchor per broker, so trading-firms/#<slug> lands here with or without a script */}
        {/* clear of the filter bar, which sticks to the top of the window from tablet width up */}
        {brokerList.map((b) => <span key={b.id} id={b.slug} aria-hidden="true" className="block scroll-mt-4 sm:scroll-mt-24" />)}
        <h2 id="by-broker-h" className="text-[17px] font-semibold text-ink">By broker: {picked?.short}</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Where its orders go, what it is paid and how that changed · {SP_LABEL[f.sp]} · {f.ot === "M" ? "market" : "marketable limit"} orders
          {picked && <> · <a href={href(brokerPath(picked.slug))} className="font-semibold text-accent hover:underline">{picked.short}'s page</a></>}
        </p>
        <ul className="mb-5 mt-4 flex flex-wrap gap-1.5" aria-label="Pick a broker">
          {brokerList.map((b) => (
            <li key={b.id}>
              <a href={`#${b.slug}`} aria-current={b.slug === pick ? "true" : undefined}
                className={`inline-flex min-h-[36px] items-center rounded-full border px-3 text-[13px] font-medium transition-colors ${b.slug === pick ? "border-accent bg-[var(--accent-soft)] text-ink" : "border-line text-ink2 hover:border-accent hover:text-ink"}`}>
                {b.short}
              </a>
            </li>
          ))}
        </ul>
        {picked && <ByBroker key={picked.id} d={d} f={f} firm={picked} />}
      </section>
    </div>
  );
}
