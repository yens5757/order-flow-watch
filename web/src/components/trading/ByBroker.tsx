// One broker's orders and payments, moved here from its broker page (whose payment line links to trading-firms/#<slug>):
// where its orders go (the ring, beside its key, which is the ring's table), its payment rate over time and the dollars it
// is paid per quarter, each chart with its table. On the latest quarter a broker that has not filed it yet shows the
// quarter before, named as such (the same fallback as its payment on the broker page). A broker that files no payment
// report of its own has nothing to show, and says so.
import { useMemo } from "react";
import type { Option } from "../../charts/EChart";
import { EChart } from "../../charts/EChart";
import { base, tip, tooltip } from "../../charts/kit";
import { lines, stackedColumns } from "../../charts/options";
import { files606, SP_LABEL, type Data, type Filters, type Firm } from "../../lib/data";
import { cents, dollars, pct, quarterLong, quarterShort } from "../../lib/format";
import type { Tokens } from "../../lib/theme";
import { useTheme } from "../../lib/theme";
import { ChartTable, Empty, Legend } from "../ui";
import { quarterName, RULE_606, trim } from "./names";

type Row = [string | null, string, string];
interface Slice { name: string; v: number; cph: number | null; hex: string; css: string }

/** The routing ring: no legend of its own (its key is the table beside it), centred in its box. */
function ring(t: Tokens, slices: Slice[]): Option {
  return {
    ...base(t),
    tooltip: tooltip(t, {
      trigger: "item",
      formatter: (p: { dataIndex: number; name: string; color: string }) => {
        const s = slices[p.dataIndex];
        const rows: Row[] = [[p.color, "Share of orders", pct(s.v, 1)]];
        if (s.cph != null) rows.push([null, "Paid per 100 shares", cents(s.cph)]);
        return tip(p.name, rows);
      },
    }),
    series: [{
      type: "pie", radius: ["55%", "86%"], center: ["50%", "50%"], padAngle: 1.5,
      itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: false }, labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 4 },
      data: slices.map((s) => ({ name: s.name, value: s.v, itemStyle: { color: s.hex } })),
    }],
  };
}

const NA = <span className="tf-na">Not reported</span>;

export function ByBroker({ d, f, firm, slot }: { d: Data; f: Filters; firm: Firm; slot: (venue: string) => number | undefined }) {
  const { t } = useTheme();
  const has606 = files606(d, firm.crd); // a CRD alone is not a 606: five brokers have one without filing

  // routing: where its orders go (top 6 + other)
  const routed = (q: string | undefined) => (q ? d.venues.filter((v) => v.crd === firm.crd && v.q === q && v.sp === f.sp) : []);
  const prevQ = d.meta.quarters[d.meta.quarters.indexOf(f.quarter) - 1];
  const late = f.quarter === d.meta.quarter && !routed(f.quarter).length && routed(prevQ).length > 0;
  const routeQ = late ? prevQ : f.quarter;
  const venues = routed(routeQ)
    .map((v) => ({ venue: v.venue, share: v.share[f.ot] ?? 0, cph: v.cph[f.ot] })).filter((v) => v.share > 0).sort((a, b) => b.share - a.share);
  const head = venues.slice(0, 6), tail = venues.slice(6);
  // a trading firm keeps its colour across the page (names.ts); any other venue, and the rest together, are grey. Names
  // are the short ones the rest of the page uses ("Virtu", "Wells Fargo")
  const tone = (venue: string) => {
    const i = slot(venue);
    return i == null ? { hex: t.context, css: "var(--context)" } : { hex: t.s[i], css: `var(--s${i + 1})` };
  };
  const slices: Slice[] = [
    ...head.map((v) => ({ name: trim(v.venue), v: v.share, cph: v.cph, ...tone(v.venue) })),
    ...(tail.length ? [{ name: `Other (${tail.length})`, v: tail.reduce((a, v) => a + v.share, 0), cph: null, hex: t.context, css: "var(--context)" }] : []),
  ];
  // some 606s list only their main venues (Futu Clearing: ~56%); show the rest rather than stretch the ring
  const listed = venues.reduce((a, v) => a + v.share, 0);
  if (venues.length && listed < 97) slices.push({ name: "Not broken down", v: 100 - listed, cph: null, hex: t.neutral, css: "var(--neutral)" });
  const routing = useMemo(() => ring(t, slices), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  // payments over time, anchored at zero on whichever side they are: most brokers are paid, a few pay their trading firm
  const qs = d.meta.quarters;
  const hist = qs.map((q) => (firm.crd ? d.pay.get(`${firm.crd}|${q}|${f.sp}`)?.[f.ot] ?? null : null));
  const known = hist.filter((v): v is number => v != null);
  const anchor = { min: known.some((v) => v < 0) ? undefined : 0, max: known.some((v) => v > 0) ? undefined : 0 };
  const rateFmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}¢`;
  // the series colours name trading firms on this page (the ring above, the off-exchange lines), so the rate is drawn in ink
  // and the types of trade below on the neutral ramp: a reader who has learned the ring never reads a firm into them
  const histChart = useMemo(() => ({
    ...lines(t, qs.map(quarterShort), [{ name: "Paid per 100 shares", values: hist, color: t.ink }], { fmt: rateFmt, area: false, ...anchor }),
    // one series: the heading names it, so no legend
    legend: { show: false },
    grid: { left: 8, right: 20, top: 14, bottom: 8, containLabel: true },
  }), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  const segs = [["SP500", "S&P 500", 0], ["OtherStocks", "Other stocks", 1], ["Options", "Options", 2]] as const;
  const usd = segs.map(([k, name, i]) => ({
    name, color: t.ramp[i], css: `var(--ramp-${i + 1})`,
    values: qs.map((q) => d.usd.filter((u) => u.crd === firm.crd && u.q === q && u.seg === k).reduce((a, u) => a + Math.max(0, u.usd), 0)),
  }));
  const usdTotal = usd.reduce((a, s) => a + s.values.reduce((x, y) => x + y, 0), 0);
  const paysOut = d.usd.some((u) => u.crd === firm.crd && u.usd < 0); // it pays its trading firm (Cash App)
  const usdChart = useMemo(() => ({
    ...stackedColumns(t, qs.map(quarterShort), usd, dollars),
    legend: { show: false }, // the key is HTML above the chart
    grid: { left: 8, right: 12, top: 14, bottom: 8, containLabel: true },
  }), [t, firm, f]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!has606) {
    return <Empty>{firm.short} files no payment report of its own (another firm routes its orders).</Empty>;
  }
  const scope = `${SP_LABEL[f.sp]} · ${f.ot === "M" ? "market" : "marketable limit"} orders`;
  return (
    <div className="tf-parts">
      <div className="tf-part tf-where">
        <h3>Where its orders go</h3>
        <p className="tf-sub">By trading firm · {scope} · {quarterName(routeQ)}{late && ", the latest it has filed"}</p>
        {slices.length ? (
          <div className="tf-ring">
            <div className="tf-ring-chart"><EChart option={routing} height={232} label={`Where ${firm.short}'s orders go, ${quarterLong(routeQ)}`} /></div>
            <table className="tbl tf-key">
              <caption className="sr-only">Where {firm.short}'s orders went: {scope.replace(" · ", ", ")}, {quarterLong(routeQ)}</caption>
              <thead>
                <tr><th scope="col">Trading firm</th><th scope="col" className="num">Share of orders</th><th scope="col" className="num">Paid per 100 shares</th></tr>
              </thead>
              <tbody>
                {slices.map((s) => (
                  <tr key={s.name}>
                    <th scope="row"><span className="tf-swrow"><span className="tf-sw" style={{ background: s.css }} aria-hidden="true" />{s.name}</span></th>
                    <td className="num">{pct(s.v, 1)}</td>
                    <td className="num">{s.cph != null ? cents(s.cph) : <><span className="tf-na" aria-hidden="true">–</span><span className="sr-only">none listed</span></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No routing reported for {quarterName(routeQ)}.</Empty>}
      </div>

      <div className="tf-part">
        <h3>Payment rate over time</h3>
        <p className="tf-sub">Cents per 100 shares, averaged across its trading firms · {scope}</p>
        {known.length ? (
          <>
            <EChart option={histChart} height={260} label={`${firm.short}'s payment rate per quarter`} />
            <ChartTable caption={`${firm.short}'s payment rate per quarter`} head={["Quarter", "Paid per 100 shares"]}
              rows={qs.map((q, i) => [quarterLong(q), hist[i] == null ? NA : cents(hist[i])])} />
          </>
        ) : <Empty>No rate reported.</Empty>}
      </div>

      <div className="tf-part">
        <h3>Paid, by type of trade</h3>
        <p className="tf-sub">Dollars per quarter ({RULE_606})</p>
        {usdTotal > 0 ? (
          <>
            <Legend items={usd.map((s) => ({ color: s.css, label: s.name }))} />
            <EChart option={usdChart} height={260} label={`Payments to ${firm.short} per quarter`} />
            <ChartTable caption={`Payments to ${firm.short} per quarter, in dollars`} head={["Quarter", ...usd.map((s) => s.name), "Total"]}
              rows={qs.map((q, i) => [quarterLong(q), ...usd.map((s) => dollars(s.values[i])), dollars(usd.reduce((a, s) => a + s.values[i], 0))])} />
          </>
        ) : <Empty>{paysOut ? `${firm.short} pays its trading firm rather than being paid, so it received nothing.` : "No dollar amounts reported."}</Empty>}
      </div>
    </div>
  );
}
