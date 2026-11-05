// brokers/<slug>/: one broker, one calm answer. First what its customers paid above the fair price per $10,000 traded and
// where that ranks among the brokers, then what a typical year costs; then every broker around it in a table, what it is
// paid for orders, its registration, its fees and where to go next. The page keeps its own filters (market orders, all
// sizes under $200,000, the latest month and payment quarter) whatever was picked elsewhere; its one control is the
// S&P 500 / other stocks switch, under the name and right above the cards, as every page's controls sit. Composition:
// .impeccable/mocks/mvp/consumer-app-sage.html (owner-approved); placement reviewed Nov 2026 (the page's brief).
// Routing, payment history and cost by order size moved: the payment line's "Details" opens this broker's section on the
// trading-firms page, and the brokers explorer has order size, execution speed and fractional shares as measures.
import { useEffect, useMemo, useRef, useState } from "react";
import "../components/broker/broker.css";
import { CompareCard } from "../components/broker/CompareCard";
import { FeesCard } from "../components/broker/FeesCard";
import { PaymentLine, TrustLine } from "../components/broker/OneLiners";
import { PriceCard } from "../components/broker/PriceCard";
import { StockSwitch } from "../components/broker/StockSwitch";
import { WhereSits } from "../components/broker/WhereSits";
import { YearCard } from "../components/broker/YearCard";
import { Breadcrumb } from "../components/ui";
import { cents, groupOf, money, sameStockWords, yearFor, type Group } from "../lib/broker";
import type { Data, Sp } from "../lib/data";
import { monthLong } from "../lib/format";
import { href, pagePath } from "../lib/routes";

/** What the live region says when the switch flips: the group, the price and both ranks the card shows, in one line. */
function status(v: Group, month: string): string {
  const c = v.m.cost10k;
  if (c == null) return `${v.name}: no price report for ${month}.`;
  const side = cents(c) > 0 ? "above" : cents(c) < 0 ? "below" : "at";
  const rank = v.rank ? `, ${v.rank.charAt(0).toLowerCase()}${v.rank.slice(1)}` : "";
  const same = v.same ? `; ${sameStockWords(v.same)} on the same stocks and order sizes` : "";
  return `${v.name}: ${money(Math.abs(c))} ${side} the fair price per $10,000 traded${rank}${same}.`;
}

/** Each shown table row's top, relative to the "Where … sits" card, by broker id. */
function rowTops(): Map<string, number> {
  const where = document.getElementById("where"), out = new Map<string, number>();
  if (!where) return out;
  const top = where.getBoundingClientRect().top;
  where.querySelectorAll<HTMLElement>("tbody tr[data-id]").forEach((tr) => {
    if (tr.offsetParent) out.set(tr.dataset.id!, tr.getBoundingClientRect().top - top);
  });
  return out;
}

export default function BrokerProfile({ d, id }: { d: Data; id: string }) {
  const firm = d.byId[id] ?? d.brokers[0];
  const clearing = firm.type === "clearing_firm";
  const views = useMemo(() => (["Y", "N"] as Sp[]).map((sp) => groupOf(d, firm, sp)), [d, firm]);
  const year = useMemo(() => (clearing ? null : yearFor(d, firm.id)), [d, firm, clearing]);
  const month = monthLong(d.meta.month);
  // "See all" (the table's button, and the link under the rank) shows every broker in place
  const [all, setAll] = useState(false);
  const [said, setSaid] = useState("");

  // the re-ranking: when the switch flips, every row that is in both tables glides from its old place to its new one and
  // the rows that only the new group lists fade in (a FLIP by broker id). Nothing moves under reduced motion; without a
  // script the switch still swaps the tables, just without the glide.
  const before = useRef<Map<string, number> | null>(null);
  const snapshot = () => { before.current = rowTops(); };
  const rerank = () => {
    const was = before.current;
    before.current = null;
    if (!was || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = rowTops(); // read after the switch: the new group's table is the one laid out
    document.querySelectorAll<HTMLElement>("#where tbody tr[data-id]").forEach((tr) => {
      const y = now.get(tr.dataset.id!), from = was.get(tr.dataset.id!);
      if (y == null) return;
      if (from == null) tr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
      else if (Math.abs(from - y) > 0.5) tr.animate([{ transform: `translateY(${from - y}px)` }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" });
    });
  };

  // the checked radio mirrored on <html data-sg>, for browsers without :has() (broker.css); read once on load too, since
  // the browser may have restored "Other stocks"
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.sg = (document.getElementById("sg-ot") as HTMLInputElement | null)?.checked ? "ot" : "sp";
    return () => { delete html.dataset.sg; };
  }, []);
  const announce = (sp: Sp) => {
    document.documentElement.dataset.sg = sp === "N" ? "ot" : "sp";
    const v = views.find((x) => x.sp === sp);
    if (v) setSaid(status(v, month));
    rerank();
  };

  return (
    <>
      {/* the page header as on every page: the breadcrumb, the name close under it, then the one switch with its scope
          right above the cards it changes */}
      <Breadcrumb up="Brokers" upHref={href(pagePath("brokers"))} here={firm.short} />
      <h1 className="bp-h1">{firm.short}</h1>
      <div className="bp-filter">
        <StockSwitch onPick={announce} onBefore={snapshot} />
        <p className="bp-scope">Market orders · {month}</p>
      </div>
      <p className="sr-only" aria-live="polite">{said}</p>

      {/* Two independent stacks on a desktop (broker.css), so no card stretches to the other column's height. On the left
          the answer, the ranked table straight under the rank it lists (so the switch's glide and re-sort read together),
          then what the broker is paid and its registration; on the right the year, the fees behind it and next steps.
          The yearly card is in the page twice and CSS shows one: on phones and tablets the copy right after the price card
          (the answer, the year, the table, then the rest: Home's and Compare's order), on a desktop the copy heading the
          right-hand column. The hidden copy is display:none, so it is neither read nor reached by Tab. */}
      <div className={`bp-board${clearing ? " is-clearing" : ""}`}>
        <div className="bp-col">
          <PriceCard d={d} views={views} onSeeAll={() => setAll(true)} />
          {year && <YearCard d={d} firm={firm} y={year} at="flow" />}
          <WhereSits d={d} firm={firm} views={views} all={all} setAll={setAll} />
          {!clearing && <PaymentLine firm={firm} views={views} />}
          {!clearing && <TrustLine d={d} firm={firm} />}
        </div>
        {!clearing && (
          <div className="bp-col">
            {year && <YearCard d={d} firm={firm} y={year} at="side" />}
            <FeesCard d={d} firm={firm} />
            <CompareCard d={d} firm={firm} />
          </div>
        )}
      </div>
    </>
  );
}
