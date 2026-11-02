// Fee facts for one broker (commission, options, margin, idle cash, transfer out) with the date they were checked.
import type { Data, Fee } from "../lib/data";
import { dayLong, pct } from "../lib/format";
import { href, pagePath } from "../lib/routes";
import { Card, Empty, Icon } from "./ui";

/** Fee dollars: whole amounts without cents ($0, $75), otherwise two decimals ($0.65, $49.95). */
const money = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
/** A source URL as a short label: "webull.com/pricing". */
const label = (u: string) => { const s = u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); return s.length > 36 ? `${s.slice(0, 34)}…` : s; };

const CONFIDENCE: Record<Fee["confidence"], string | null> = {
  high: null,
  medium: "Partly confirmed on the broker's own pages.",
  low: "Not yet confirmed on the broker's own pages.",
};

export function FeesCard({ d, id }: { d: Data; id: string }) {
  const firm = d.byId[id];
  const short = firm?.short ?? id;
  const fee: Fee | undefined = d.fees[id];
  const checkedIso = d.meta.feesChecked ?? fee?.checked;
  const when = checkedIso ? `checked ${dayLong(checkedIso)}` : "check date unknown";
  // [label, formatted value or null when not verified, one-clause gloss]; a product the broker doesn't have says so
  const na = (k: Fee["notOffered"][number]) => (fee?.notOffered.includes(k) ? "Not offered" : fee?.varies.includes(k) ? "Varies" : null);
  const rows: [string, string | null, string][] = fee ? [
    ["Commission per stock trade", fee.commission == null ? na("commission") : money(fee.commission),
      "Per online stock or ETF trade; most brokers charge $0."],
    ["Options, per contract", fee.optionsFee == null ? na("optionsFee") : money(fee.optionsFee),
      "On top of any commission; the price reports don't cover options."],
    ["Margin interest rate", fee.marginRate == null ? na("marginRate") : pct(fee.marginRate, 2),
      "Yearly, standard rate at about a $25,000 balance."],
    ["Interest on idle cash", fee.cashYield == null ? na("cashYield") : pct(fee.cashYield, 2),
      "Yearly (APY) on uninvested cash in a standard account."],
    ["Full transfer out", fee.transferOut == null ? na("transferOut") : money(fee.transferOut),
      "To move your whole account to another broker."],
  ] : [];
  for (const r of rows) if (r[1] === "Varies") r[2] = "Depends on order size, a balance tier or a program, or the rate isn't published: see the broker.";
  const known = rows.filter((r) => r[1] != null).length;
  // BrokerCheck lookups back the CRD, not the fees; the trust card covers that side
  const sources = (fee?.sources ?? []).filter((u) => !/brokercheck/i.test(u));
  const note = fee ? CONFIDENCE[fee.confidence] : null;

  const body = !fee ? (
    <Empty><span className="px-6">{firm?.type === "clearing_firm"
      ? `${short} is a clearing firm that settles trades for other brokers; it has no retail fee schedule.`
      : `${short}'s fees aren't checked yet.`}</span></Empty>
  ) : !fee.retail ? (
    <Empty><span className="px-6">{short} offers advisor-managed accounts only, with no public price list.</span></Empty>
  ) : known === 0 ? (
    <Empty><span className="px-6">No fee confirmed on {short}'s own pages yet. Most brokers charge $0 per stock trade.</span></Empty>
  ) : (
    <ul className="divide-y divide-line">
      {rows.map(([name, value, gloss]) => (
        <li key={name} className="flex items-start justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-ink">{name}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{gloss}</div>
          </div>
          <div className={`shrink-0 text-right ${value == null ? "pt-0.5 text-[12.5px] font-medium text-muted" : "tnum font-display text-[17px] font-bold text-ink"}`}>{value ?? "Not confirmed"}</div>
        </li>
      ))}
    </ul>
  );

  const foot = fee && fee.retail ? (
    <>
      {known > 0 ? <>{short}'s price list, {when}.</> : <>Fees {when}.</>}
      {sources.length > 0 && <> Sources: {sources.map((u, i) => (
        <span key={u}>{i > 0 && ", "}<a href={u} target="_blank" rel="noopener" className="text-accent hover:underline">{label(u)}</a></span>
      ))}.</>}
      {note && <> {note}</>}
    </>
  ) : undefined;

  return (
    <Card title={`What ${short} charges`} sub="For a standard self-directed account"
      right={<a href={`${href(pagePath("brokers"))}?m=commission`} className="-my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-semibold text-accent">Every broker's fees<Icon name="arrow" size={14} /></a>}
      foot={foot}>
      {body}
    </Card>
  );
}
