// Below the answer, full width: the ranking as stacked bars with an HTML key (only the brokers whose figure is complete:
// a minimum can't be ranked against full figures), every broker as a sortable table (the visitor's broker on the Here row,
// each name picks that broker, an incomplete figure reads "at least"), and how the parts add up with the sources.
import { useMemo } from "react";
import { EChart } from "../../charts/EChart";
import { andList } from "../../lib/broker";
import { yearSaid } from "../../lib/cash";
import type { CostInputs, CostLine } from "../../lib/cost";
import type { Data } from "../../lib/data";
import { dayLong, monthLong, pct } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { useTheme } from "../../lib/theme";
import { DataTable, type Col } from "../DataTable";
import { Card, Empty, Legend } from "../ui";
import { stackedBars } from "./chart";
import { bestYield, missingFact, partsInUse, pool, poolClause, totalWords, unknownWord, usd, type Ranked } from "./model";

/** The parts in use, the same array while the answers that pick them stay the same (so the chart isn't rebuilt). */
export function useParts(inp: CostInputs) {
  const key = [inp.trades > 0, inp.options > 0, inp.idleCash > 0, inp.margin > 0].join();
  return useMemo(() => partsInUse(inp), [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Ranking({ d, lines, ranked, me, inp, onPick }: {
  d: Data; lines: CostLine[]; ranked: Ranked; me: CostLine | undefined; inp: CostInputs; onPick: (id: string) => void;
}) {
  const { t } = useTheme();
  const parts = useParts(inp);
  const rows = ranked.complete;
  const chart = useMemo(() => stackedBars(t, rows, me?.id, parts), [t, rows, me?.id, parts]);
  // the key lists the parts that show as bars; a part at $0 everywhere (commissions, today) is in the tooltip and the table
  const keyed = parts.filter((p) => rows.some((l) => Math.abs(l[p.key]) >= 0.005));
  const left = lines.filter((l) => l.gaps.length);
  const checked = d.meta.feesChecked ? `checked ${dayLong(d.meta.feesChecked)}` : "not yet checked";
  const names = left.length > 4 ? `${left.slice(0, 3).map((l) => l.short).join(", ")} and ${left.length - 3} more` : andList(left.map((l) => l.short));
  return (
    <Card id="ranked" title="Ranked for your trades" sub={`Dollars a year, cheapest first: ${pool(rows.length, poolClause(inp))}`}
      foot={<>Prices: each broker's SEC Rule 605 report for {monthLong(d.meta.month)}, on orders of {usd(inp.size)}. Fees: each broker's own pages, {checked}. Estimates, not advice.</>}>
      {rows.length ? (
        <>
          {keyed.length > 1 && <div className="calc-key"><Legend items={keyed.map((p) => ({ color: t.s[p.slot], label: p.label }))} /></div>}
          <EChart option={chart} height={rows.length * 30 + 36}
            label={`Yearly cost at ${pool(rows.length, poolClause(inp))}, cheapest first${parts.length > 1 ? `, split into ${andList(parts.map((p) => p.label.toLowerCase()))}` : ""}. The table below lists every figure.`}
            onClick={(p) => { if (p.data?.id) onPick(p.data.id); }} />
        </>
      ) : <Empty>{lines.length ? "No broker has every fee these trades need confirmed, so none is ranked. The table below has what is known." : `No broker reports prices for orders of ${usd(inp.size)} this month.`}</Empty>}
      {rows.length > 0 && left.length > 0 && (
        <p className="calc-fn">Not ranked: {names}. A fee {left.length === 1 ? "it needs isn't" : "they need isn't"} confirmed, so {left.length === 1 ? "its figure is" : "their figures are"} only a minimum; the table lists {left.length === 1 ? "it" : "them"}.</p>
      )}
    </Card>
  );
}

export function Breakdown({ lines, ranked, me, inp, onPick }: { lines: CostLine[]; ranked: Ranked; me: CostLine | undefined; inp: CostInputs; onPick: (id: string) => void }) {
  const parts = useParts(inp);
  const unranked = <><span aria-hidden="true">–</span><span className="sr-only">Not ranked</span></>;
  const cols: Col<CostLine>[] = [
    { key: "rank", label: "Rank", num: true, hint: "Brokers whose every fee is confirmed, cheapest first", value: (r) => ranked.ranks.get(r.id) ?? null, render: (r) => ranked.ranks.get(r.id) ?? unranked },
    { key: "name", label: "Broker", pin: true, value: (r) => r.short },
    {
      key: "total", label: "A year", num: true, value: (r) => Math.round(r.total * 100) / 100,
      render: (r) => (r.gaps.length ? <span className="calc-least">{totalWords(r)}</span> : <b>{yearSaid(r.total)}</b>),
    },
    ...parts.map((p): Col<CostLine> => ({
      key: p.key, label: p.label, num: true,
      // an unknown fee is a word on screen and an empty cell in the CSV, never $0
      value: (r) => { const f = missingFact(r, p.key); return f && p.key !== "spread" ? null : Math.round(r[p.key] * 100) / 100; },
      render: (r) => { const f = missingFact(r, p.key); return f && p.key !== "spread" ? <span className="calc-unk">{unknownWord(f)}</span> : yearSaid(r[p.key]); },
    })),
  ];
  return (
    <Card id="breakdown" className="calc-tablecard" title="Every broker, in dollars" sub="A year of your trades · pick a broker to see it above">
      <DataTable rows={lines} cols={cols} initial={{ key: "rank", dir: 1 }} rowKey={(r) => r.id} here={(r) => r.id === me?.id}
        onRow={(r) => onPick(r.id)} rowLabel={(r) => (r.id === me?.id ? `${r.short}, your broker` : `Pick ${r.short}`)}
        search={(r) => `${r.name} ${r.short}`} searchLabel="Find a broker" file="yearly-cost-by-broker.csv" caption="Yearly cost at each broker, in dollars" />
    </Card>
  );
}

export function HowCard({ d }: { d: Data }) {
  const best = bestYield(d);
  return (
    <Card title="How it adds up"
      foot={<>A fee that isn't confirmed is left out, never counted as $0. Not counted: options prices, limit orders that wait for a price, taxes, promotions and fund fees. <a className="ulink calc-link" href={href(pagePath("how-we-measure"))}>How we measure</a></>}>
      <dl className="calc-how">
        <div><dt>Trade prices</dt><dd>What each broker's customers paid above the fair price on orders your size (SEC Rule 605, {monthLong(d.meta.month)}), times what you trade a year, split by your stock mix.</dd></div>
        <div><dt>Commissions</dt><dd>Your trades times the commission per stock trade.</dd></div>
        <div><dt>Options fees</dt><dd>Contracts times the fee per contract. Options prices aren't reported, so they aren't counted.</dd></div>
        <div><dt>Idle cash</dt><dd>Your cash times the interest it misses compared with the best-paying broker{best ? ` (${best.short}, ${pct(best.rate, 2)})` : ""}.</dd></div>
        <div><dt>Margin interest</dt><dd>What you borrow times the standard margin rate for a $25,000 balance.</dd></div>
      </dl>
    </Card>
  );
}
