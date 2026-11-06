// "Who sends orders where": the brokers down the side, the trading firms they send orders to across the top, each cell
// the share of the broker's orders that firm got (or the rate it paid the broker), as a real table shaded like a heatmap.
// The shading belongs to the chart: four steps of the sequential palette, light cells with ink and dark cells with the
// card colour, each pair at 5:1 or more in both themes (trading.css); every number is written in its cell. A broker's
// name is a link to its own section further down (trading-firms/#<slug>), and a press anywhere on its row follows it;
// rows are never Tab stops. The table scrolls sideways inside the card with the names pinned.
import { useRef, useState, type MouseEvent } from "react";
import { andList } from "../../lib/broker";
import { nameOf, SP_LABEL, type Data, type Filters } from "../../lib/data";
import { DOT, quarterLong } from "../../lib/format";
import { Card, Empty, Info, Segmented, Switch, useSideScroll } from "../ui";
import { centsCell, quarterName, shareCell, trim } from "./names";

type Show = "share" | "pay";

export function RoutingMatrix({ d, f, set, pick }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; pick: string }) {
  const [metric, setMetric] = useState<Show>("share");

  // routing matrix: brokers x trading firms (the firms that got at least 15 points of share across the brokers, at most 9)
  const brokers = d.firms.filter((b) => b.crd && (f.clearing || b.type !== "clearing_firm"));
  const rows = d.venues.filter((v) => v.q === f.quarter && v.sp === f.sp && brokers.some((b) => b.crd === v.crd));
  const tot = new Map<string, number>();
  rows.forEach((v) => tot.set(v.venue, (tot.get(v.venue) ?? 0) + (v.share[f.ot] ?? 0)));
  const top = [...tot].filter(([, s]) => s >= 15).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([v]) => v);
  const cols = metric === "share" && tot.size > top.length ? [...top, "Other"] : top;
  // in alphabetical order, so a visitor finds their broker
  const brs = brokers.filter((b) => rows.some((v) => v.crd === b.crd && (v.share[f.ot] ?? 0) > 0))
    .sort((a, b) => a.short.localeCompare(b.short));
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
  const grid = brs.map((b) => cols.map((c) => cell(b.crd, c)));
  const max = Math.max(1, ...grid.flat().filter((v): v is number => v != null));
  // four steps of the palette by the cell's share of the largest value; zero and below are left unshaded
  const level = (v: number) => (v <= 0 ? 0 : v <= max * 0.25 ? 1 : v <= max * 0.5 ? 2 : v <= max * 0.75 ? 3 : 4);
  const fmt = metric === "share" ? shareCell : centsCell;

  // read across a row: brokers paid one rate (within a cent) by every firm shown vs brokers whose rate differs by firm
  const paid = brs.map((b) => top.map((c) => rate(b.crd, c)).filter((v): v is number => v != null)).filter((r) => r.length >= 2);
  const oneRate = paid.filter((r) => Math.max(...r) - Math.min(...r) <= 1).length;
  const negative = paid.some((r) => r.some((v) => v < 0));
  // the firms that fill orders for the most brokers here
  const reach = top.map((c) => ({ c, n: brs.filter((b) => rows.some((v) => v.crd === b.crd && v.venue === c && (v.share[f.ot] ?? 0) > 0)).length }));
  const most = Math.max(0, ...reach.map((r) => r.n));
  const leaders = reach.filter((r) => r.n === most).slice(0, 2).map((r) => trim(r.c));
  // brokers that filed the quarter before but not this one yet (the latest quarter only): named, never dropped silently
  const prevQ = d.meta.quarters[d.meta.quarters.indexOf(f.quarter) - 1];
  const late = f.quarter === d.meta.quarter && prevQ
    ? brokers.filter((b) => !brs.includes(b) && d.venues.some((v) => v.crd === b.crd && v.q === prevQ && v.sp === f.sp && (v.share[f.ot] ?? 0) > 0))
    : [];

  const orders = f.ot === "M" ? "market orders" : "marketable limit orders";
  const say = metric === "share"
    ? (most > 0 ? `${andList(leaders)} ${leaders.length > 1 ? "each fill" : "fills"} orders for ${most} of these ${brs.length} brokers.` : null)
    : (paid.length > 0 ? `${oneRate} of ${paid.length} brokers are paid one rate (within a cent) by every firm here; ${paid.length - oneRate} ${paid.length - oneRate === 1 ? "is" : "are"} paid different rates.` : null);
  const caption = `${metric === "share" ? "Share of each broker's" : "Cents per 100 shares each trading firm paid each broker for its"} ${SP_LABEL[f.sp]} ${orders}, ${quarterLong(f.quarter)}. A broker's name opens its own section below.`;

  const box = useRef<HTMLDivElement>(null);
  const { over, scrolled } = useSideScroll(box, [metric, cols.length, brs.length]);
  // a press on the row (not on its link, and not while selecting text) follows the link
  const press = (e: MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as Element).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    e.currentTarget.querySelector<HTMLAnchorElement>("a")?.click();
  };

  const notes = [
    metric === "pay" && negative ? "Below zero: the broker paid the firm." : null,
    late.length ? `Not filed for ${quarterName(f.quarter)} yet: ${andList(late.map((b) => b.short))}.` : null,
    brs.length ? "A broker's name opens its own breakdown below." : null,
  ].filter(Boolean);

  return (
    <Card className="tf-matrix" title="Who sends orders where"
      sub={`${SP_LABEL[f.sp]}${DOT}${orders}${DOT}${quarterName(f.quarter)}${DOT}${metric === "share" ? "share of each broker's orders" : "cents per 100 shares paid to the broker"}`}
      info="From each broker's own payment report (SEC Rule 606): the trading firms it sent orders to, the share each got and the rate each paid it."
      infoTopic="this table"
      right={
        <div className="tf-mx-tools">
          <Segmented<Show> size="sm" label="Show" value={metric} onChange={setMetric} options={[["share", "Share of orders"], ["pay", "Payment rate"]]} />
          <span className="tf-apex">
            <Switch label="Show Apex Clearing" checked={f.clearing} onChange={(clearing) => set({ clearing })} />
            <Info topic="Apex Clearing">Apex routes orders for several brokers; you can't open an account there.</Info>
          </span>
        </div>
      }
      foot={notes.length ? notes.map((n) => <p key={n}>{n}</p>) : undefined}>
      {say && <p className="tf-say">{say}</p>}
      {brs.length ? (
        <div ref={box} className={`tbox tf-hm-box${scrolled ? " is-scrolled" : ""}`} tabIndex={over ? 0 : undefined}
          role={over ? "region" : undefined} aria-label={over ? "Who sends orders where, scrolls sideways" : undefined}>
          <table className="tf-hm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="c-br">Broker</th>
                {cols.map((c) => <th key={c} scope="col">{trim(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {brs.map((b, y) => (
                <tr key={b.id} className={b.slug === pick ? "here" : undefined} onClick={press}>
                  <th scope="row" className="c-br">
                    <a className="tf-go" href={`#${b.slug}`}>{nameOf(b)}</a>
                  </th>
                  {cols.map((c, x) => {
                    const v = grid[y][x];
                    return v == null
                      ? <td key={c}><span className="sr-only">none</span></td>
                      : <td key={c} data-l={level(v)}>{fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No routing reports for {quarterName(f.quarter)}.</Empty>
      )}
    </Card>
  );
}
