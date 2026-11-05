// Home: the question, the visitor's broker and the broker page's answer for it, with every broker ranked beside it.
// One picker, which only reports the pick (the answer changes in place and links onward; it never navigates), and the
// broker page's S&P 500 / other stocks switch; then a yearly one-liner into the calculator, what the reports show (each
// finding with the caveat that cuts against it) and the comparisons people open most. Every number and sentence is
// generated from site.json through lib/broker.ts, the broker pages' own helpers, so the two never disagree. Styles:
// components/home/home.css on top of the broker page's broker.css. No chart library loads on this page.
import { useEffect, useMemo, useRef, useState } from "react";
import "../components/broker/broker.css";
import "../components/home/home.css";
import { loadBroker, saveBroker } from "../components/calculator/store";
import { AnswerCard } from "../components/home/AnswerCard";
import { Findings } from "../components/home/Findings";
import { Hero } from "../components/home/Hero";
import { Pairs } from "../components/home/Pairs";
import { Ranking } from "../components/home/Ranking";
import { YearLine } from "../components/home/YearLine";
import { Segmented, Select } from "../components/ui";
import { cents, groupOf, money, SP_GAP, yearFor, type Group } from "../lib/broker";
import type { Data, Sp } from "../lib/data";
import { monthLong } from "../lib/format";
import { useBrowserLayoutEffect } from "../lib/hooks";

const STOCKS: [Sp, string][] = [["Y", `S&P${SP_GAP}500 stocks`], ["N", "Other stocks"]];

/** What the live region says after a pick or a flip: the broker, the stock group, the price and the rank, in one line. */
function status(g: Group, month: string): string {
  const c = g.m.cost10k;
  if (c == null) return `${g.m.f.short}: no ${g.sp === "N" ? "other-stock" : "S&P 500"} price report for ${month}.`;
  const side = cents(c) > 0 ? "above" : cents(c) < 0 ? "below" : "at";
  return `${g.m.f.short}, ${g.name}: ${money(Math.abs(c))} ${side} the fair price per $10,000 traded${g.rank ? `, ${g.rank}` : ""}.`;
}

/** The ranking on screen: the page holds two copies and CSS shows one (Ranking.tsx). */
const shownRanking = () => [...document.querySelectorAll<HTMLElement>(".hm-rank")].find((el) => el.offsetParent !== null) ?? null;

/** Each shown ranking row's top, relative to its card, by broker id. */
function rowTops(): Map<string, number> {
  const card = shownRanking(), out = new Map<string, number>();
  if (!card) return out;
  const top = card.getBoundingClientRect().top;
  card.querySelectorAll<HTMLElement>("tbody tr[data-id]").forEach((tr) => {
    if (tr.offsetParent) out.set(tr.dataset.id!, tr.getBoundingClientRect().top - top);
  });
  return out;
}

export default function Home({ d }: { d: Data }) {
  const [pick, setPick] = useState(() => (d.byId.HOOD ? "HOOD" : d.brokers[0].id));
  const [sp, setSp] = useState<Sp>("Y");
  // "See all": the whole ranking below 1024px (from there it always shows)
  const [all, setAll] = useState(false);
  const [said, setSaid] = useState("");
  // the visitor's broker is remembered in the browser (the calculator reads the same key); read before the first paint,
  // never while rendering, since this page is also rendered on the server
  useBrowserLayoutEffect(() => {
    const id = loadBroker();
    if (d.byId[id]?.type === "broker") setPick(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const firm = d.byId[pick] ?? d.brokers[0];
  const g = useMemo(() => groupOf(d, firm, sp), [d, firm, sp]);
  const year = useMemo(() => yearFor(d, firm.id), [d, firm]);
  const month = monthLong(d.meta.month);
  const options = useMemo(() => [...d.brokers]
    .sort((a, b) => a.short.localeCompare(b.short, "en", { sensitivity: "base" }))
    .map((f): [string, string] => [f.id, f.short]), [d]);

  // a pick or a flip is announced once the card shows it (the remembered broker, restored on load, is not)
  const tell = useRef(false);
  useEffect(() => {
    if (!tell.current) return;
    tell.current = false;
    setSaid(status(g, month));
  }, [g, month]);
  const choose = (id: string) => { tell.current = true; setPick(id); saveBroker(id); };

  // the re-ranking: when the switch flips, every row shown before and after glides from its old place to its new one and
  // the rows only the new group shows fade in (a FLIP by broker id, measured before the state changes). The answer's
  // scale glides on its own (scale.css). Nothing moves under reduced motion.
  const before = useRef<Map<string, number> | null>(null);
  const flip = (v: Sp) => {
    if (v === sp) return;
    before.current = rowTops();
    tell.current = true;
    setSp(v);
  };
  useBrowserLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (!was || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = rowTops();
    shownRanking()?.querySelectorAll<HTMLElement>("tbody tr[data-id]").forEach((tr) => {
      const y = now.get(tr.dataset.id!), from = was.get(tr.dataset.id!);
      if (y == null) return;
      if (from == null) tr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
      else if (Math.abs(from - y) > 0.5) tr.animate([{ transform: `translateY(${from - y}px)` }, { transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" });
    });
  }, [sp]);

  return (
    <>
      <Hero built={d.meta.built}>
        <div className="hm-ctl">
          <Select label="Your broker" value={firm.id} onChange={choose} options={options} />
          <Segmented label="Stocks" value={sp} onChange={flip} options={STOCKS} />
          <p className="hm-scope">Market orders · {month}</p>
        </div>
      </Hero>
      <p className="sr-only" role="status">{said}</p>
      {/* Two independent stacks from 1024px (home.css): the answer, the year, the findings and the comparisons on the left,
          every broker ranked on the right. Below that one stack, the ranking straight after the yearly line: the ranking
          is in the page twice and CSS shows one, so the order on screen is the reading order at every width. */}
      <div className="hm-board">
        <div className="hm-col">
          <AnswerCard d={d} g={g} onSeeAll={() => setAll(true)} />
          <YearLine firm={firm} y={year} />
          <Ranking d={d} g={g} all={all} setAll={setAll} at="flow" />
          <Findings d={d} />
          <Pairs d={d} />
        </div>
        <div className="hm-col hm-col-side">
          <Ranking d={d} g={g} all={all} setAll={setAll} at="side" />
        </div>
      </div>
    </>
  );
}
