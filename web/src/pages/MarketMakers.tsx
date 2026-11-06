// trading-firms/: who fills retail orders. One column of cards in the order a visitor asks, the same on a phone: the trading
// firms' prices on the same stocks and order sizes (ranked rails that glide and re-rank when the stock switch flips), which
// broker sends orders where, one broker's routing and payments ("By broker", straight under the table whose names open it;
// a broker page's payment "Details" opens it as trading-firms/#<slug>), and last the firms' share of off-exchange trading,
// market context that no filter changes. The filters are shared with the compare and all-firms pages (App.tsx); the Apex
// switch sits in the routing card, the only part it changes, so the bar fits one row and sticks on a desktop.
// Styles: components/trading/.
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { EChart } from "../charts/EChart";
import { lines } from "../charts/options";
import { FilterBar } from "../components/Filters";
import { SETTLE, whole } from "../components/compare/Picker";
import { ByBroker } from "../components/trading/ByBroker";
import { firmSlots, quarterName, RULE_606, trim } from "../components/trading/names";
import { PriceRails } from "../components/trading/PriceRails";
import { RoutingMatrix } from "../components/trading/RoutingMatrix";
import "../components/trading/trading.css";
import { Card, ChartTable, Empty, Icon, Legend, PageHeader, Select } from "../components/ui";
import { andList } from "../lib/broker";
import { files606, nameOf, SP_LABEL, type Data, type Filters } from "../lib/data";
import { monthLong, pct, quarterLong, quarterShort } from "../lib/format";
import { onNavigate } from "../lib/hooks";
import { brokerPath, href, pagePath } from "../lib/routes";
import { useTheme } from "../lib/theme";

/** The broker a "By broker" section opens on before the address names one: Robinhood, the most looked-up. */
const FIRST = "HOOD";

const NONE = <><span aria-hidden="true">–</span><span className="sr-only">none</span></>;

export default function MarketMakers({ d, f, set }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void }) {
  const { t } = useTheme();
  const mmName = Object.fromEntries(d.marketMakers.map((m) => [m.id, m.name]));
  const firmName = (id: string) => trim(mmName[id] ?? id);
  const detail = monthLong(d.meta.detailMonth);

  // price quality on the same stock x lot x size cells, best price first. Every rail spans the widest gap of either stock
  // group, so flipping the switch moves a dot only as far as the firm's gap really changed
  const gaps = d.sameStock.marketMakers.filter((g) => g.sp === f.sp).sort((a, b) => a.gap - b.gap);
  const missing = d.marketMakers.filter((m) => !gaps.some((g) => g.id === m.id));
  const ext = Math.max(10, Math.ceil(Math.max(0, ...d.sameStock.marketMakers.map((g) => Math.abs(g.gap))) / 10) * 10);
  const best = gaps[0], worst = gaps[gaps.length - 1];
  const pts = (g: number) => `${Math.abs(g).toFixed(1)} points of the spread ${g < 0 ? "less" : "more"}`;
  const priceSay = !best ? null
    : `Customers paid ${pts(best.gap)} on orders ${firmName(best.id)} filled than on other firms' orders in the same stocks and order sizes` +
      (worst && worst.id !== best.id ? `, and ${Math.abs(worst.gap).toFixed(1)} points ${worst.gap < 0 ? "less" : "more"} on orders ${firmName(worst.id)} filled.` : ".");

  // FINRA off-exchange volume share; the quarter still in progress is left out (it would look like a crash)
  const built = new Date(d.meta.built);
  const current = `${built.getFullYear()}Q${Math.floor(built.getMonth() / 3) + 1}`;
  const qs = [...new Set(d.otc.map((o) => o.q))].filter((q) => q < current).sort();
  const lastQ = qs[qs.length - 1], firstQ = qs[0];
  const shareAt = (firm: string, q: string | undefined) => d.otc.find((o) => o.firm === firm && o.q === q)?.share ?? null;
  const shareIn = (firm: string) => shareAt(firm, lastQ) ?? 0;
  const firms = [...new Set(d.otc.map((o) => o.firm))].sort((a, b) => shareIn(b) - shareIn(a));
  // one colour per trading firm across the page: the volume lines and every broker's ring (names.ts)
  const slots = useMemo(() => firmSlots(d, firms), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const colourOf = (name: string) => slots.get(name) ?? 0;
  const otcChart = useMemo(() => ({
    ...lines(t, qs.map(quarterShort), firms.map((name) => ({
      name: trim(name), color: t.s[colourOf(name)], values: qs.map((q) => shareAt(name, q)),
    })), { fmt: (v) => `${v.toFixed(0)}%`, endLabels: true, min: 0 }),
    legend: { show: false }, // the key is HTML above the chart
    grid: { left: 8, right: 96, top: 14, bottom: 8, containLabel: true },
  }), [t, d]); // eslint-disable-line react-hooks/exhaustive-deps
  const lead = firms[0], leadShare = lead ? shareIn(lead) : null;
  const was = lead && firstQ !== lastQ ? shareAt(lead, firstQ) : null;
  const trend = was == null || leadShare == null ? ""
    : Math.round(leadShare) === Math.round(was) ? `, the same as in ${quarterName(firstQ)}`
      : `, ${leadShare > was ? "up" : "down"} from ${pct(was, 0)} in ${quarterName(firstQ)}`;
  const volumeSay = lead && lastQ && leadShare != null ? `${trim(lead)} had the largest share in ${quarterName(lastQ)}: ${pct(leadShare, 0)}${trend}.` : null;
  const missingNote = missing.length
    ? `${andList(missing.map((m) => trim(m.name) + (m.name === lead ? " (the biggest by volume)" : "")))} ${missing.length > 1 ? "have" : "has"} no detailed report for ${detail} yet.`
    : null;

  // "By broker": one section, one anchor per broker (trading-firms/#robinhood, which a broker page's payment line links to).
  // The first render is the pre-rendered one (the default broker); the address's hash is read once the page is live,
  // and again whenever it changes (a pick below, a name in the routing table, Back, another broker page's link while
  // this page is open).
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

  // the picker only reports a choice; "Show" moves the address to it, which opens that broker's section (never on change).
  // While the select names a broker other than the one shown, "Show" turns solid and names it ("Show Webull"), a line
  // beside it says who is on screen, and the status line says the pick once it has settled (as Compare's picker does).
  const [choice, setChoice] = useState(pick);
  useEffect(() => setChoice(pick), [pick]);
  const chosen = d.bySlug[choice];
  const pending = !!chosen && !!picked && chosen.id !== picked.id;
  const show = (e: FormEvent) => {
    e.preventDefault();
    const here = document.activeElement;
    if (location.hash.slice(1) === choice) section.current?.scrollIntoView({ block: "start" });
    else location.hash = choice;
    // a jump to a #<slug> anchor (not focusable) hands focus to the page: keep it on "Show", where the visitor is
    if (here instanceof HTMLElement && here !== document.body && document.activeElement !== here) here.focus({ preventScroll: true });
  };
  const [said, setSaid] = useState("");
  const shown = useRef(pick);
  // the broker the status line last said was picked (null: none since the section last changed)
  const told = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const choose = (v: string) => {
    setChoice(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (v === shown.current) { if (told.current) { told.current = null; setSaid(""); } }
      else if (v !== told.current && d.bySlug[v]) {
        told.current = v;
        setSaid(`${d.bySlug[v].short} picked; press Show to see it.`);
      }
    }, SETTLE);
  };
  // a change of broker, said once it has happened (a pick still waiting to be said is moot then)
  useEffect(() => {
    if (shown.current === pick) return;
    shown.current = pick;
    window.clearTimeout(timer.current);
    told.current = null;
    if (picked) setSaid(`Showing ${picked.short}: where its orders go and what it is paid.`);
  }, [pick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tf">
      <PageHeader title="Who fills your order?"
        intro="A handful of trading firms (market makers) fill most retail orders and set the price you get." />
      <FilterBar d={d} f={f} set={set} show={["sp", "ot", "quarter"]} />

      <div className="tf-stack">
        <Card title="Prices on the same stocks and order sizes" sub={`${SP_LABEL[f.sp]} · market orders · ${detail}`}
          info="The spread is the gap between the best price to buy and the best price to sell. A point is 1% of it; fewer points paid is a better price."
          infoTopic="points of the spread"
          foot={
            <>
              <p>A firm's figure mixes its own pricing with the brokers that send it orders.{missingNote && ` ${missingNote}`}</p>
              <p><a className="ulink tf-go-line" href={href(pagePath("how-we-measure"))}>How we measure</a></p>
            </>
          }>
          {priceSay && <p className="tf-say">{priceSay}</p>}
          {gaps.length ? (
            <PriceRails rows={gaps} ext={ext} name={firmName}
              caption={`Trading firms by the points of the spread customers paid on their orders compared with other firms' orders, ${SP_LABEL[f.sp]}, market orders, ${detail}, best price first`} />
          ) : <Empty>No detailed reports for {detail} yet.</Empty>}
        </Card>

        {/* straight after the prices, whose foot says a firm's figure mixes in the brokers that send it orders: this table
            shows which ones; it stays directly above "By broker", which its names open */}
        <RoutingMatrix d={d} f={f} set={set} pick={pick} />

        <section ref={section} id="by-broker" className="card tf-by" aria-labelledby="by-broker-h">
          {/* one anchor per broker, so trading-firms/#<slug> lands here with or without a script */}
          {brokerList.map((b) => <span key={b.id} id={b.slug} aria-hidden="true" className="tf-anchor" />)}
          <div className="card-head">
            <div className="card-titles">
              <h2 id="by-broker-h" className="card-title">{picked?.short}: where its orders go and what it is paid</h2>
              {picked && files606(d, picked.crd) && <p className="card-sub">From its own payment reports ({RULE_606})</p>}
            </div>
            {/* under the heading at every width (not in its right-hand slot), so a longer "Show <broker>" never moves the select */}
            <form className="tf-pick js-only" onSubmit={show}>
              <Select label="Broker" value={choice} onChange={choose} options={brokerList.map((b) => [b.slug, nameOf(b)] as [string, string])} />
              <button type="submit" className={`btn ${pending ? "btn-solid" : "btn-ghost"} tf-show`}>
                {pending ? `Show ${whole(chosen.short)}` : "Show"}
              </button>
              {pending && <p className="tf-shown">Showing {whole(picked.short)}</p>}
            </form>
          </div>
          <p className="sr-only" role="status">{said}</p>
          {picked && <ByBroker key={picked.id} d={d} f={f} firm={picked} slot={(venue) => slots.get(venue)} />}
          {picked && (
            <a className="go tf-out" href={href(brokerPath(picked.slug))}>
              {picked.short}'s {picked.type === "clearing_firm" ? "prices" : "prices and fees"}<Icon name="arrow" size={20} />
            </a>
          )}
        </section>

        {/* last: market context (all off-exchange volume, not only retail orders) and the one card no filter changes, so the
            cards the filters change sit together under the bar */}
        <Card title="Share of off-exchange stock trading"
          sub={qs.length ? `FINRA volume data · full quarters, ${quarterName(firstQ)} to ${quarterName(lastQ)}` : "FINRA volume data"}
          info="Each firm's share of the stock trading FINRA records away from the exchanges, by quarter. The quarter still in progress is left out."
          infoTopic="off-exchange trading">
          {volumeSay && <p className="tf-say">{volumeSay}</p>}
          {qs.length ? (
            <>
              <Legend items={firms.map((name) => ({ color: `var(--s${colourOf(name) + 1})`, label: trim(name) }))} />
              <EChart option={otcChart} height={300} label="Each firm's share of off-exchange stock trading by quarter" />
              <ChartTable caption="Share of off-exchange stock trading by firm and quarter" head={["Quarter", ...firms.map(trim)]}
                rows={qs.map((q) => [quarterLong(q), ...firms.map((name) => { const v = shareAt(name, q); return v == null ? NONE : pct(v, 1); })])} />
            </>
          ) : <Empty>No FINRA volume data yet.</Empty>}
        </Card>
      </div>
    </div>
  );
}
