// Fee facts for one broker (commission, options, margin, idle cash, transfer out) with the date they were checked.
import type { Data, Fee } from "../lib/data";
import { dayLong, pct } from "../lib/format";
import { Card, Empty, Icon } from "./ui";

/** Fee dollars: whole amounts without cents ($0, $75), otherwise two decimals ($0.65, $49.95). */
const money = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
/** A source URL as a short label: "webull.com/pricing". */
const label = (u: string) => { const s = u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); return s.length > 36 ? `${s.slice(0, 34)}…` : s; };

const CONFIDENCE: Record<Fee["confidence"], string | null> = {
  high: null,
  medium: "Partly confirmed: some of these facts could not be read from the broker's own pages.",
  low: "Low confidence: these facts could not be confirmed on the broker's own pages yet.",
};

export function FeesCard({ d, id }: { d: Data; id: string }) {
  const firm = d.byId[id];
  const short = firm?.short ?? id;
  const fee: Fee | undefined = d.fees[id];
  const checkedIso = d.meta.feesChecked ?? fee?.checked;
  const when = checkedIso ? `checked ${dayLong(checkedIso)}` : "check date unknown";
  // [label, formatted value or null when not verified, one-line gloss]; a product the broker doesn't have says so
  const na = (k: Fee["notOffered"][number]) => (fee?.notOffered.includes(k) ? "Not offered" : null);
  const rows: [string, string | null, string][] = fee ? [
    ["Commission per stock trade", fee.commission == null ? na("commission") : money(fee.commission),
      "Charged on each online stock or ETF trade. Nearly every broker charges $0, so the cost hides in the price you get."],
    ["Options, per contract", fee.optionsFee == null ? na("optionsFee") : money(fee.optionsFee),
      "To open an options trade, on top of any per-trade commission. The official price reports don't cover options, so this is the fee only; the prices options orders get aren't reported."],
    ["Margin interest rate", fee.marginRate == null ? na("marginRate") : pct(fee.marginRate, 2),
      "Yearly interest on money borrowed against your account, at about a $25,000 balance: the standard rate, not a new-account or promotional one."],
    ["Interest on idle cash", fee.cashYield == null ? na("cashYield") : pct(fee.cashYield, 2),
      "Yearly interest (APY) on uninvested cash in a standard account, not a paid tier or a separate cash product."],
    ["Full transfer out", fee.transferOut == null ? na("transferOut") : money(fee.transferOut),
      "One-off fee to move your whole account to another broker."],
  ] : [];
  const known = rows.filter((r) => r[1] != null).length;
  // BrokerCheck lookups back the CRD, not the fees; the trust card covers that side
  const sources = (fee?.sources ?? []).filter((u) => !/brokercheck/i.test(u));
  const note = fee ? CONFIDENCE[fee.confidence] : null;

  const body = !fee ? (
    <Empty><span className="px-6">{firm?.type === "clearing_firm"
      ? `${short} is a clearing firm that settles trades for other brokers, not an account you open yourself, so there is no retail fee schedule.`
      : `We haven't checked ${short}'s fees yet.`}</span></Empty>
  ) : !fee.retail ? (
    <Empty><span className="px-6">{short} doesn't offer an account you manage yourself: its accounts come with an advisor and a fee schedule of their own, so there is no public price list to compare.</span></Empty>
  ) : known === 0 ? (
    <Empty><span className="px-6">No fee could be confirmed on {short}'s own pages yet. Most US brokers charge $0 per stock trade; what differs is the price you get.</span></Empty>
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
      {known > 0 ? <>From {short}'s own price list, {when}.</> : <>Fees {when}.</>}
      {sources.length > 0 && <> Sources: {sources.map((u, i) => (
        <span key={u}>{i > 0 && ", "}<a href={u} target="_blank" rel="noopener" className="text-accent hover:underline">{label(u)}</a></span>
      ))}.</>}
      {note && <> {note}</>}
    </>
  ) : undefined;

  return (
    <Card title={`What ${short} charges`} sub="Published fees for a standard account you manage yourself"
      right={<a href="#/explore?m=commission" className="-my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-semibold text-accent">Every broker's fees<Icon name="arrow" size={14} /></a>}
      foot={foot}>
      {body}
    </Card>
  );
}
