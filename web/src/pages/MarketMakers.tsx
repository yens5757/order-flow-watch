import { useMemo, useState } from "react";
import { EChart } from "../charts/EChart";
import { divergingBars, heatmap, lines } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { Card, Empty, Icon, Kpi, PageHeader, Segmented } from "../components/ui";
import { SP_LABEL, type Data, type Filters } from "../lib/data";
import { cents, monthLong, pct, quarterLong, quarterShort } from "../lib/format";
import { go } from "../lib/hooks";
import { useTheme } from "../lib/theme";

const trim = (n: string) => n.replace(/ (Securities|Americas|Financial|Execution|Services|LLC)$/, "");

export default function MarketMakers({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const { t } = useTheme();
  const [metric, setMetric] = useState<"share" | "pay">("share");
  const mmName = Object.fromEntries(d.marketMakers.map((m) => [m.id, m.name]));

  // price quality on identical trades
  const gaps = d.sameStock.marketMakers.filter((g) => g.sp === f.sp).sort((a, b) => a.gap - b.gap);
  const missing = d.marketMakers.filter((m) => !gaps.some((g) => g.id === m.id));
  const gapChart = useMemo(() => divergingBars(t, gaps.map((g) => ({
    id: g.id, name: trim(mmName[g.id] ?? g.id), v: g.gap,
    rows: [[null, "Its customers pay", pct(g.own, 1)], [null, "Other market makers, same trades", pct(g.peers, 1)], [null, "Identical cells compared", g.cells.toLocaleString()]],
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

  // routing matrix: brokers x market makers
  const brokers = d.firms.filter((b) => b.crd && (f.clearing || b.type !== "clearing_firm"));
  const rows = d.venues.filter((v) => v.q === f.quarter && v.sp === f.sp && brokers.some((b) => b.crd === v.crd));
  const tot = new Map<string, number>();
  rows.forEach((v) => tot.set(v.venue, (tot.get(v.venue) ?? 0) + (v.share[f.ot] ?? 0)));
  const top = [...tot].filter(([, s]) => s >= 15).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([v]) => v);
  const cols = metric === "share" && tot.size > top.length ? [...top, "Other"] : top;
  const brs = brokers.filter((b) => rows.some((v) => v.crd === b.crd && (v.share[f.ot] ?? 0) > 0));
  const cell = (crd: string | null, venue: string) => {
    const vs = rows.filter((v) => v.crd === crd && (venue === "Other" ? !top.includes(v.venue) : v.venue === venue));
    if (!vs.length) return null;
    if (metric === "share") return vs.reduce((a, v) => a + (v.share[f.ot] ?? 0), 0);
    return (vs[0].share[f.ot] ?? 0) > 0 ? vs[0].cph[f.ot] : null;
  };
  const cells: [number, number, number | null][] = brs.flatMap((b, y) => cols.map((c, x) => [x, y, cell(b.crd, c)] as [number, number, number | null]));
  const heat = useMemo(() => heatmap(t, brs.map((b) => b.short), cols.map(trim), cells,
    { fmt: metric === "share" ? (v) => `${v.toFixed(0)}%` : (v) => `${v.toFixed(0)}¢`, label: metric, rowIds: brs.map((b) => b.id) }),
  [t, f, metric]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rise">
      <PageHeader eyebrow="Market makers" title="The firms that fill your orders"
        sub="A handful of trading firms fill most retail stock orders. How good are their prices, how big are they, and who sends them orders?" />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "quarter", "clearing"]} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi icon="layers" label="Market makers compared" value={gaps.length} sub={`on identical ${SP_LABEL[f.sp]} trades, ${monthLong(d.meta.detailMonth)}`} />
        <Kpi icon="chart" label={`Biggest by volume, ${lastQ ? quarterShort(lastQ) : ""}`} value={leadShare != null ? pct(leadShare, 0) : "–"}
          sub={lead ? `${trim(lead)}'s share of off-exchange stock volume` : undefined} />
        <Kpi icon="coins" label="Venues routed to" value={tot.size} sub={`by the tracked brokers, ${quarterLong(f.quarter)}`} />
      </section>

      {missing.length > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4 text-[13.5px] text-ink2">
          <Icon name="info" size={18} className="mt-0.5 text-[var(--warning)]" />
          <span><b className="text-ink">{missing.map((m) => trim(m.name)).join(", ")} not in this comparison.</b> {missing.some((m) => m.id === "CDRG")
            ? "Citadel Securities blocks automated downloads, so its monthly report has to be added by hand; the weekly refresh compares the others."
            : "No detailed report for this month yet."}</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Price quality on the same stocks" sub={`${SP_LABEL[f.sp]} · market orders · points of the spread vs the other market makers`}
          info="A market maker's report covers every order it received, from many brokers, so its score mixes its own pricing with the brokers that send it orders.">
          {gaps.length ? <EChart option={gapChart} height={Math.max(260, gaps.length * 40 + 40)} label="Market-maker price quality on identical trades" /> : <Empty>No detailed market-maker reports.</Empty>}
        </Card>
        <Card title="Share of off-exchange stock volume" sub="FINRA OTC transparency data · complete quarters · click a name in the legend to hide it">
          {qs.length ? <EChart option={otcChart} height={Math.max(260, gaps.length * 40 + 40)} label="Market makers' share of off-exchange volume over time" /> : <Empty>No FINRA data.</Empty>}
        </Card>
      </div>

      <Card className="mt-5" title="Who sends orders where" sub={`${SP_LABEL[f.sp]} · ${quarterLong(f.quarter)} · ${metric === "share" ? "share of each broker's orders" : "payment per 100 shares"} · click a broker for its profile`}
        right={<Segmented size="sm" value={metric} onChange={setMetric} options={[["share", "Share of orders"], ["pay", "Payment rate"]]} />}
        foot={metric === "pay" ? <>Most brokers are paid the same rate by every market maker (Schwab {cents(10)}, SoFi {cents(18)}); only Robinhood and Webull vary by venue.</> : undefined}>
        {brs.length ? <EChart option={heat} height={brs.length * 34 + 160} label="Routing matrix of brokers and market makers"
          onClick={(p) => { const y = p.data?.value?.[1]; if (y != null && brs[y]) go(`broker/${brs[y].id}`); }} /> : <Empty>No routing reports for this quarter.</Empty>}
      </Card>
    </div>
  );
}
