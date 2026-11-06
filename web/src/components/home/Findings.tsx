// What the reports show, in three plain lines, each with the caveat that cuts against it: brokers differ on the same stocks
// and order sizes (partly with how big their customers' orders are, when that test holds); payment for order flow doesn't
// reliably predict the price (or does, if the tests say so); customers' typical order size does. Every verdict is read from
// the evidence table the How-we-measure page shows (site.json `evidence`, looked up by claim text as that page does) and
// from the same-stock gaps, so a rebuild can turn any of them around.
// Each finding ends in an (i) that opens one plain line in place, as the broker page's do (PriceCard's useNote), so it never
// covers the next finding: how sure the finding is in words ("weak and could be chance": the strength words of format.ts
// and How we measure's verdicts), its counts and dates last, then a link to the statistics on How we measure, which keeps
// the rank correlations and p-values.
import { useMemo } from "react";
import { andList, pageFilters, SAME_STOCK_MARGIN, SP_GAP } from "../../lib/broker";
import { brokerRows, type Data, type Evidence, type Sp } from "../../lib/data";
import { monthLong, quarterLong, strength } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { useNote } from "../broker/PriceCard";
import { Card, Icon } from "../ui";

interface Finding {
  key: string; lead: string; text: string;
  /** names the (i): "About <topic>" */
  topic: string;
  /** the line the (i) opens: plain words first, counts and dates last */
  note: string;
  /** the How-we-measure section that holds its statistics */
  at: "same-stocks" | "evidence";
}

interface Test { sp: Sp; e: Evidence }

const GROUP: Record<Sp, string> = { Y: `S&P${SP_GAP}500 stocks`, N: "other stocks" };
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A test that holds: unlikely to be chance (p under 0.05) and pointing the way the claim says. */
const holds = (e: Evidence | undefined) => !!e && e.p < 0.05 && Math.sign(e.rho) === e.expect;

/** How sure a test is, in words: its strength (format.ts, as the explorer says it) and How we measure's verdict said
 *  plainly: "weak and could be chance", "strong and unlikely to be chance", "moderate and goes the other way". */
function sure(e: Evidence): string {
  const s = strength(e.rho);
  if (e.p >= 0.05) return `${s} and could be chance`;
  return Math.sign(e.rho) === e.expect ? `${s} and unlikely to be chance` : `${s} and goes the other way`;
}

/** The link in each stock group, said once when both read alike: "On both S&P 500 and other stocks the link is strong and
 *  unlikely to be chance.", or "On S&P 500 stocks the link is weak and could be chance; on other stocks it is …". */
function perGroup(parts: { sp: Sp; words: string }[]): string {
  if (parts.length === 2 && parts[0].words === parts[1].words) return `On both S&P${SP_GAP}500 and other stocks the link is ${parts[0].words}.`;
  return `${parts.map((x, i) => `${i ? "on" : "On"} ${GROUP[x.sp]} ${i ? "it" : "the link"} is ${x.words}`).join("; ")}.`;
}

/** A count or a date held on one line ("19 brokers", "September 2026", "Jul–Sep 2026"): a no-break space for each space
 *  and a word joiner after a dash. */
const keep = (s: string) => s.replace(/ /g, "\u00a0").replace(/–/g, "–\u2060");
/** "All 25 brokers", or "21 of the 25 brokers" when some have no figure. */
const pool = (n: number, of: number) => (n >= of ? `All ${keep(`${n} brokers`)}` : `${n} of the ${keep(`${of} brokers`)}`);

function findings(d: Data): Finding[] {
  const month = keep(monthLong(d.meta.month));
  const tests = (re: RegExp): Test[] => (["Y", "N"] as Sp[])
    .map((sp) => ({ sp, e: d.evidence.find((e) => e.sp === sp && re.test(e.claim)) }))
    .filter((t): t is Test => !!t.e);
  const out: Finding[] = [];

  // 1. brokers differ on the same stocks and order sizes (S&P 500 market orders, the gap the broker pages use). Its caveat
  // is the order-size test on the same S&P 500 gaps: when it holds, the best and worst partly follow who the customers are
  const priced = brokerRows(d, pageFilters(d, "Y"));
  const gaps = priced.filter((r) => r.gap != null).sort((a, b) => a.gap! - b.gap!);
  if (gaps.length >= 2) {
    const best = gaps[0], worst = gaps[gaps.length - 1];
    const differ = worst.gap! - best.gap! > 2 * SAME_STOCK_MARGIN;
    const follows = holds(tests(/^Bigger typical order/).find((t) => t.sp === "Y")?.e);
    out.push({
      key: "differ",
      lead: differ ? "Prices differ by broker, even on the same stocks and order sizes." : "Prices are close across brokers on the same stocks and order sizes.",
      text: !differ
        ? "On average: a single trade can land either side."
        : follows
          ? `${best.f.short}'s customers did best and ${worst.f.short}'s worst; part of that follows how big their customers' orders are.`
          : `${best.f.short}'s customers did best and ${worst.f.short}'s worst on average; a single trade can land either side.`,
      topic: "the same-stock comparison",
      // the broker page's same-stock line in its own words (lib/broker.ts sameStockNote); the points of the spread stay on
      // How we measure
      note: "Each broker's customers compared with other brokers' customers on the same stocks and order sizes, so what they "
        + `happen to trade doesn't count. ${gaps.length < priced.length ? `${pool(gaps.length, priced.length)} had enough matching trades:` : `${pool(gaps.length, priced.length)},`} `
        + `S&P${SP_GAP}500 market orders under $200,000, ${keep(monthLong(d.meta.detailMonth))}.`,
      at: "same-stocks",
    });
  }

  // 2. payment for order flow, raw and with share price held equal
  const raw = tests(/^Paid more → customers pay more of the spread/);
  const equal = tests(/^Paid more → customers pay more, at equal share price/);
  const rows = raw.map((t) => ({ sp: t.sp, raw: t.e, equal: equal.find((x) => x.sp === t.sp)?.e }));
  if (rows.length) {
    const n = rows[0].raw.n;
    const stays = rows.filter((x) => holds(x.raw) && holds(x.equal)), fades = rows.filter((x) => holds(x.raw) && !holds(x.equal));
    const names = (xs: typeof rows) => andList(xs.map((x) => GROUP[x.sp]));
    // a link that holds is said with what happens at equal share price, as the line above says it
    const words = (x: (typeof rows)[number]) => {
      if (!holds(x.raw) || !x.equal) return sure(x.raw);
      if (holds(x.equal)) return `${sure(x.raw)}, even at equal share price`;
      return `${strength(x.raw.rho)}, but ${x.equal.p < 0.05 ? "goes the other way" : "could be chance"} once share price is held equal`;
    };
    out.push({
      key: "paid",
      lead: stays.length
        ? `Brokers paid more for orders gave worse prices on ${names(stays)}.`
        : "Payment for order flow doesn't reliably predict the price.",
      text: stays.length
        ? `Even with share price held equal; a pattern across ${n} brokers, not proof of cause.`
        : fades.length
          ? `${capital(names(fades))} show a link, but it fades once share price is held equal.`
          : `Only ${n} brokers report both, so a small effect could go unseen.`,
      topic: "the payment test",
      note: `${perGroup(rows.map((x) => ({ sp: x.sp, words: words(x) })))} ${keep(`${n} brokers`)} with a payment report, ${month} `
        + `prices and ${keep(quarterLong(d.meta.quarter))} payments.`,
      at: "evidence",
    });
  }

  // 3. who the customers are: bigger typical orders, better prices on the same stocks and order sizes
  const size = tests(/^Bigger typical order/);
  if (size.length) {
    const slower = tests(/^Slower fills/).filter((t) => holds(t.e));
    const sizeHolds = size.some((t) => holds(t.e)), slowHolds = slower.length > 0;
    // the groups the speed test holds in, named only when it doesn't hold in every group the line speaks for
    const slowWhere = size.every((t) => slower.some((s) => s.sp === t.sp)) ? "" : `, on ${andList(slower.map((t) => GROUP[t.sp]))}`;
    const n = size[0].e.n;
    out.push({
      key: "size",
      lead: sizeHolds ? "Brokers whose customers trade bigger got better prices." : "Customers' typical order size doesn't reliably predict the price.",
      text: !sizeHolds
        ? `Only ${n} brokers, so a small effect could go unseen.`
        : slowHolds
          ? "Even on the same stocks and order sizes; part of it may be how orders are handled."
          : `Even on the same stocks and order sizes; a pattern across ${n} brokers, not proof of cause.`,
      topic: "the order-size test",
      // the speed test backs the line's "how orders are handled", so it is said only where that line says it (and for
      // the one stock group it holds in, when only one does)
      note: perGroup(size.map((t) => ({ sp: t.sp, words: sure(t.e) })))
        + (sizeHolds && slowHolds ? ` Brokers whose orders took longer to fill got better prices too${slowWhere}.` : "")
        + ` ${pool(n, d.brokers.length)}, ${month}.`,
      at: "evidence",
    });
  }
  return out;
}

/** One finding: the claim, its caveat ending in the (i), and the line the (i) opens right under it. */
function Item({ f }: { f: Finding }) {
  const note = useNote(`finding-${f.key}`);
  const id = `finding-${f.key}-line`;
  // the (i) keeps to the caveat's last word, so it never starts a line on its own
  const cut = f.text.lastIndexOf(" ") + 1;
  return (
    <li>
      <p className="hm-f-lead">{f.lead}</p>
      <p className="hm-f-text">
        {f.text.slice(0, cut)}
        <span className="nw">
          {f.text.slice(cut)}{" "}
          <button type="button" className="bp-def js-only" aria-expanded={note.open} aria-controls={id}
            onClick={note.toggle} onMouseEnter={note.enter} onMouseLeave={note.leave} onFocus={note.enter} onBlur={note.leave}>
            <Icon name="info" size={20} /><span className="sr-only">About {f.topic}</span>
          </button>
        </span>
      </p>
      <p id={id} className={`bp-def-note hm-f-note${note.open ? " open" : ""}`}
        onMouseEnter={note.enter} onMouseLeave={note.leave} onFocus={note.enter} onBlur={note.leave}>
        {f.note} <a className="ulink" href={`${href(pagePath("how-we-measure"))}#${f.at}`}>The statistics</a>
      </p>
    </li>
  );
}

export function Findings({ d }: { d: Data }) {
  const list = useMemo(() => findings(d), [d]);
  if (!list.length) return null;
  return (
    <Card className="hm-find" title="What the reports show"
      foot={<a className="go" href={href(pagePath("how-we-measure"))}>How we measure<Icon name="arrow" size={20} /></a>}>
      <ul className="hm-finds">
        {list.map((f) => <Item key={f.key} f={f} />)}
      </ul>
    </Card>
  );
}
