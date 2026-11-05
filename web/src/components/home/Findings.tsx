// What the reports show, in three plain lines, each with the caveat that cuts against it: brokers differ on the same stocks
// and order sizes (partly with how big their customers' orders are, when that test holds); payment for order flow doesn't
// reliably predict the price (or does, if the tests say so); customers' typical order size does. Every verdict is read from the evidence table the How-we-measure page shows (site.json
// `evidence`, looked up by claim text as that page does) and from the same-stock gaps, so a rebuild can turn any of them
// around. The statistics sit behind each (i).
import { useMemo } from "react";
import { andList, pageFilters, SAME_STOCK_MARGIN, SP_GAP } from "../../lib/broker";
import { brokerRows, type Data, type Evidence, type Sp } from "../../lib/data";
import { monthLong, quarterLong, signed } from "../../lib/format";
import { href, pagePath } from "../../lib/routes";
import { Card, Icon, Info } from "../ui";

interface Finding { key: string; lead: string; text: string; topic: string; stats: string }

const GROUP: Record<Sp, string> = { Y: `S&P${SP_GAP}500 stocks`, N: "other stocks" };
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A p-value as the How-we-measure page writes it. */
const pv = (p: number) => (p < 0.001 ? "p < 0.001" : `p ${p.toFixed(p < 0.01 ? 3 : 2)}`);
const r2 = (e: Evidence) => `${signed(e.rho, 2)} (${pv(e.p)})`;
/** A test that holds: unlikely to be chance (p under 0.05) and pointing the way the claim says. */
const holds = (e: Evidence | undefined) => !!e && e.p < 0.05 && Math.sign(e.rho) === e.expect;

function findings(d: Data): Finding[] {
  const month = monthLong(d.meta.month);
  const ev = (sp: Sp, re: RegExp) => d.evidence.find((e) => e.sp === sp && re.test(e.claim));
  const out: Finding[] = [];

  // 1. brokers differ on the same stocks and order sizes (S&P 500 market orders, the gap the broker pages use). Its caveat
  // is the order-size test on the same S&P 500 gaps: when it holds, the best and worst partly follow who the customers are
  const gaps = brokerRows(d, pageFilters(d, "Y")).filter((r) => r.gap != null).sort((a, b) => a.gap! - b.gap!);
  if (gaps.length >= 2) {
    const best = gaps[0], worst = gaps[gaps.length - 1];
    const differ = worst.gap! - best.gap! > 2 * SAME_STOCK_MARGIN;
    const clientele = ev("Y", /^Bigger typical order/);
    const follows = holds(clientele);
    out.push({
      key: "differ",
      lead: differ ? "Prices differ by broker, even on the same stocks and order sizes." : "Prices are close across brokers on the same stocks and order sizes.",
      text: !differ
        ? "On average: a single trade can land either side."
        : follows
          ? `${best.f.short}'s customers did best and ${worst.f.short}'s worst; part of that follows how big their customers' orders are.`
          : `${best.f.short}'s customers did best and ${worst.f.short}'s worst on average; a single trade can land either side.`,
      topic: "the same-stock comparison",
      stats: `Points of the spread against other brokers on the same S&P${SP_GAP}500 stocks and order sizes, ${month}: ${best.f.short} ${signed(best.gap, 1)}, ${worst.f.short} ${signed(worst.gap, 1)}; ${gaps.length} brokers had enough matching trades.${clientele ? ` Customers' typical order size against prices on the same S&P${SP_GAP}500 stocks and order sizes, ${clientele.n} brokers: rank correlation ${r2(clientele)}.` : ""}`,
    });
  }

  // 2. payment for order flow, raw and with share price held equal
  const raw = (sp: Sp) => ev(sp, /^Paid more → customers pay more of the spread/);
  const equal = (sp: Sp) => ev(sp, /^Paid more → customers pay more, at equal share price/);
  const sps: Sp[] = ["Y", "N"];
  const rows = sps.map((sp) => ({ sp, raw: raw(sp), equal: equal(sp) })).filter((x) => x.raw);
  if (rows.length) {
    const n = rows[0].raw!.n;
    const stays = rows.filter((x) => holds(x.raw) && holds(x.equal)), fades = rows.filter((x) => holds(x.raw) && !holds(x.equal));
    const names = (xs: typeof rows) => andList(xs.map((x) => GROUP[x.sp]));
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
      stats: `Rank correlation of payment with the share of the spread customers paid, ${n} brokers: ${rows.map((x) => `${GROUP[x.sp]} ${r2(x.raw!)}`).join(", ")}${rows.some((x) => x.equal) ? `; with share price held equal ${rows.filter((x) => x.equal).map((x) => r2(x.equal!)).join(" and ")}` : ""}. Under 0.05 is unlikely to be chance. ${month} prices; payments from ${quarterLong(d.meta.quarter)}, or the quarter before for a broker yet to file it.`,
    });
  }

  // 3. who the customers are: bigger typical orders, better prices on the same stocks and order sizes
  const size = sps.map((sp) => ev(sp, /^Bigger typical order/)).filter((e): e is Evidence => !!e);
  if (size.length) {
    const slower = sps.map((sp) => ev(sp, /^Slower fills/)).filter((e): e is Evidence => !!e);
    const sizeHolds = size.some(holds), slowHolds = slower.some(holds);
    out.push({
      key: "size",
      lead: sizeHolds ? "Brokers whose customers trade bigger got better prices." : "Customers' typical order size doesn't reliably predict the price.",
      text: !sizeHolds
        ? `Only ${size[0].n} brokers, so a small effect could go unseen.`
        : slowHolds
          ? "Even on the same stocks and order sizes; part of it may be how orders are handled."
          : `Even on the same stocks and order sizes; a pattern across ${size[0].n} brokers, not proof of cause.`,
      topic: "the order-size test",
      stats: `Rank correlation of customers' typical order size with prices on the same stocks and order sizes, ${size[0].n} brokers, ${month}: ${size.map((e) => `${GROUP[e.sp]} ${r2(e)}`).join(", ")}.${slower.length ? ` Orders filled more slowly got better prices too: ${slower.map(r2).join(" and ")}.` : ""}`,
    });
  }
  return out;
}

export function Findings({ d }: { d: Data }) {
  const list = useMemo(() => findings(d), [d]);
  if (!list.length) return null;
  return (
    <Card className="hm-find" title="What the reports show"
      foot={<a className="go" href={href(pagePath("how-we-measure"))}>How we measure<Icon name="arrow" size={20} /></a>}>
      <ul className="hm-finds">
        {list.map((f) => (
          <li key={f.key}>
            <p className="hm-f-lead">{f.lead}<Info topic={f.topic}>{f.stats}</Info></p>
            <p className="hm-f-text">{f.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
