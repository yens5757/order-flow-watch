import { useMemo, useState } from "react";
import { EChart } from "../charts/EChart";
import { divergingBars, heatmap, lines } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { Card, Empty, Icon, Kpi, PageHeader, Segmented } from "../components/ui";
import { SP_LABEL, type Data, type Filters } from "../lib/data";
import { monthLong, pct, quarterLong, quarterShort } from "../lib/format";
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
    rows: [[null, "Its customers pay", pct(g.own, 1)], [null, "Other trading firms, same trades", pct(g.peers, 1)], [null, "Matching trades compared", g.cells.toLocaleString()]],
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

  return (
    <div className="rise">
      <PageHeader eyebrow="Trading firms" title="Who fills your order?"
        sub="Your broker sends most stock orders to a handful of trading firms (market makers), and they set the price you get. Which firms each broker uses, how good their prices are on identical trades, and how big they are." />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "quarter", "clearing"]} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi icon="coins" label="Trading firms used" value={tot.size} sub={`by the brokers on this site, ${quarterLong(f.quarter)}`} />
        <Kpi icon="layers" label="Trading firms compared" value={gaps.length} sub={`on identical ${SP_LABEL[f.sp]} trades, ${monthLong(d.meta.detailMonth)}`} />
        <Kpi icon="chart" label={`Biggest by volume, ${lastQ ? quarterShort(lastQ) : ""}`} value={leadShare != null ? pct(leadShare, 0) : "–"}
          sub={lead ? `${trim(lead)}'s share of stock trading done away from the exchanges` : undefined} />
      </section>

      <Card className="mt-5" title="Who sends orders where" sub={`${SP_LABEL[f.sp]} · ${quarterLong(f.quarter)} · ${metric === "share" ? "share of each broker's orders" : "cents the broker is paid per 100 shares"} · click a broker for its profile`}
        right={<Segmented size="sm" label="Show" value={metric} onChange={setMetric} options={[["share", "Share of orders"], ["pay", "Payment rate"]]} />}
        foot={metric === "pay" && paid.length > 0 ? <>Read across a row. {oneRate} of the {paid.length} brokers that use two or more of these firms are paid one rate (within a cent) by all of them; {paid.length - oneRate} are paid different rates by different firms.{negative && " A number below zero means the broker paid the trading firm."}</> : undefined}>
        {brs.length ? <EChart option={heat} height={brs.length * 34 + 160} label="Which trading firms each broker sends its orders to"
          onClick={(p) => { const y = p.data?.value?.[1]; if (y != null && brs[y]) go(`broker/${brs[y].id}`); }} /> : <Empty>No reports of where orders went for this quarter.</Empty>}
      </Card>

      {missing.length > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4 text-[13.5px] text-ink2">
          <Icon name="info" size={18} className="mt-0.5 text-[var(--warning)]" />
          <span><b className="text-ink">{missing.map((m) => trim(m.name) + (m.name === lead ? " (the biggest by volume)" : "")).join(", ")} not in this comparison:</b> no detailed report for {monthLong(d.meta.detailMonth)} yet.</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Price quality on the same stocks" sub={`${SP_LABEL[f.sp]} · market orders · points of the spread vs the other trading firms`}
          info="A market maker's report covers every order it received, from many brokers, so its score mixes its own pricing with the brokers that send it orders.">
          {gaps.length ? <EChart option={gapChart} height={Math.max(260, gaps.length * 40 + 40)} label="Trading firms' price quality on identical trades" /> : <Empty>No trading-firm reports for this month.</Empty>}
        </Card>
        <Card title="Share of stock trading done away from exchanges" sub="FINRA's public volume data · full quarters only · click a name to hide it">
          {qs.length ? <EChart option={otcChart} height={Math.max(260, gaps.length * 40 + 40)} label="Trading firms' share of stock trading done away from exchanges, by quarter" /> : <Empty>No FINRA data.</Empty>}
        </Card>
      </div>
    </div>
  );
}
