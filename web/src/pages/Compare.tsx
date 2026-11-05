// compare/<a>-vs-<b>/: two brokers as one calm answer, in the broker page's world. First how much less one broker's
// customers paid above the fair price per $10,000 traded, each broker's figure and rank, and both on the neutral scale
// among every broker, with the generated short answer; then a typical year at each, the two side by side, what each is
// paid, their registration, cost by order size, and other comparisons. The URL names the pair in one order (alphabetical
// by slug, see comparePath); compare/ shows Robinhood and Fidelity under its own heading, "Compare two brokers", so the
// two addresses are not copies of one another. The stock and order-type filters are App's, shared with the trading-firm
// and all-firm pages. Composition and direction: .impeccable/surfaces/web-src-pages-compare-tsx.md.
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerCard } from "../components/compare/AnswerCard";
import "../components/compare/compare.css";
import { OtherPairs } from "../components/compare/OtherPairs";
import { gapMoney, gapOf, ordersWord, pairFilters, placesFor, stocksWord } from "../components/compare/pair";
import { Picker } from "../components/compare/Picker";
import { PayCard, TrustCard } from "../components/compare/Records";
import { SideBySide } from "../components/compare/SideBySide";
import { SizeCard } from "../components/compare/SizeCard";
import { YearPair } from "../components/compare/YearPair";
import { Info, Segmented } from "../components/ui";
import { payment, SP_GAP, yearFor, type Year } from "../lib/broker";
import { metric, type Data, type Fee, type Filters, type Ot, type Sp } from "../lib/data";
import { monthLong } from "../lib/format";
import { comparePath, DEFAULT_PAIR, href } from "../lib/routes";

/** `explicit`: the pair is in the URL (compare/<a>-vs-<b>/). On the bare compare/ page the heading names the page and the
 *  pair is a line under it linking to its own page, so the two URLs are not copies of one another (one canonical each). */
export default function Compare({ d, f, set, a, b, explicit }: { d: Data; f: Filters; set: (p: Partial<Filters>) => void; a: string; b: string; explicit: boolean }) {
  const A = d.byId[a] ?? d.byId[DEFAULT_PAIR[0]] ?? d.brokers[0];
  const B = d.byId[b] ?? d.byId[DEFAULT_PAIR[1]] ?? d.brokers[1];
  const s = pairFilters(f);
  const rA = metric(d, A, s), rB = metric(d, B, s);
  const places = useMemo(() => placesFor(d, s), [d, s.sp, s.ot, s.month, s.quarter]); // eslint-disable-line react-hooks/exhaustive-deps
  const pA = payment(d, rA, f.sp, f.ot), pB = payment(d, rB, f.sp, f.ot);
  const feeA: Fee | undefined = d.fees[A.id], feeB: Fee | undefined = d.fees[B.id];
  const years = useMemo(() => [yearFor(d, A.id), yearFor(d, B.id)] as [Year, Year], [d, A.id, B.id]);
  const monthName = monthLong(f.month);
  const same = A.id === B.id;

  // a flip of either switch is announced in one line: the stocks and orders shown, and the gap they give
  const g = gapOf(A, B, rA, rB);
  const unpriced = [rA.cost10k == null ? A.short : null, rB.cost10k == null ? B.short : null].filter(Boolean).join(" or ");
  const line = `${stocksWord(f.sp)}, ${ordersWord(f.ot)}: ${g.c == null ? `no price for ${unpriced}`
    : g.cheap ? `${gapMoney(g.c)} cheaper at ${g.cheap.short} per $10,000 traded` : "about the same price at both"}.`;
  const [said, setSaid] = useState("");
  const shown = useRef(`${f.sp}${f.ot}`);
  useEffect(() => {
    const k = `${f.sp}${f.ot}`;
    if (k === shown.current) return;
    shown.current = k;
    setSaid(line.charAt(0).toUpperCase() + line.slice(1));
  }, [f.sp, f.ot, line]);

  return (
    <>
      <div className="ph cmp-head">
        <div className="ph-text">
          <h1 className="ph-h1">{explicit ? `${A.short} vs ${B.short}` : "Compare two brokers"}</h1>
          {!explicit && (
            <p className="ph-intro">
              Pick any two of the {d.brokers.length} brokers. Showing{" "}
              <a className="cmp-a" href={href(comparePath(A.slug, B.slug))}>{A.short} vs {B.short}</a>.
            </p>
          )}
        </div>
        <Picker d={d} A={A} B={B} />
      </div>

      <div className="cmp-filter" role="group" aria-label="Filters">
        <Segmented<Sp> label="Stocks" value={f.sp} onChange={(sp) => set({ sp })} options={[["Y", `S&P${SP_GAP}500 stocks`], ["N", "Other stocks"]]} />
        <span className="cmp-ot">
          <Segmented<Ot> label="Order type" value={f.ot} onChange={(ot) => set({ ot })} options={[["M", "Market orders"], ["ML", "Marketable limit"]]} />
          <Info topic="order types">Market orders fill at once; marketable limit orders add a price cap.</Info>
        </span>
        <p className="cmp-scope">Orders under $200,000 · {monthName}</p>
      </div>
      <p className="sr-only" role="status">{said}</p>

      {same ? (
        <section className="card cmp-same" aria-labelledby="cmp-same-h">
          <h2 id="cmp-same-h">Same broker twice</h2>
          <p className="cmp-sub">Pick a second broker above, or open one of the comparisons below.</p>
        </section>
      ) : (
        // two independent stacks on a desktop, as on the broker page; the yearly card is in the page twice and CSS shows
        // one (after the answer on phones and tablets, heading the right column on a desktop)
        <div className="cmp-board">
          <div className="cmp-col">
            <AnswerCard d={d} f={f} A={A} B={B} rA={rA} rB={rB} pA={pA} pB={pB} feeA={feeA} feeB={feeB} places={places} monthName={monthName} />
            <YearPair d={d} A={A} B={B} years={years} at="flow" />
            <SideBySide f={f} A={A} B={B} rA={rA} rB={rB} feeA={feeA} feeB={feeB} monthName={monthName} />
          </div>
          <div className="cmp-col">
            <YearPair d={d} A={A} B={B} years={years} at="side" />
            <PayCard f={f} pays={[[A, pA], [B, pB]]} />
            <TrustCard d={d} firms={[A, B]} />
            <SizeCard d={d} f={f} A={A} B={B} monthName={monthName} />
          </div>
        </div>
      )}
      <OtherPairs d={d} A={A} B={B} />
    </>
  );
}
