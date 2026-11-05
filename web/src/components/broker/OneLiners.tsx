// Two one-line cards under the ranked table: what the broker is paid for its customers' orders (Rule 606, the quarter
// named, a late filer's previous quarter named as such), and who it is registered as (FINRA BrokerCheck, SIPC).
import { payAmount, payWhen, type Group } from "../../lib/broker";
import type { Data, Firm } from "../../lib/data";
import { href, pagePath } from "../../lib/routes";
import { Icon } from "../ui";

/** One group's payment sentence: the figure in bold, the quarter it comes from in brackets. It names a payment to a
 *  trading firm only when the 606 shows one (Cash App → Virtu); money that goes to exchanges is called exchange fees. */
function payText(v: Group) {
  const p = v.pay, when = payWhen(p);
  switch (p.kind) {
    case "paid": return <>Paid <strong>about {payAmount(p)}</strong> of its customers' {v.orders} by the trading firms that fill them ({when}).</>;
    case "zero": return <><strong>Not paid</strong> for its customers' {v.orders} by the trading firms that fill them ({when}).</>;
    case "pays": return <><strong>Pays its trading firm about {payAmount(p)}</strong> of its customers' {v.orders}, rather than being paid ({when}).</>;
    case "fees": return <><strong>Not paid</strong> by the trading firms that fill its customers' {v.orders}; it pays about {payAmount(p)} in exchange fees ({when}).</>;
    case "missing": return <><strong>Not in this quarter's payment report</strong> for its customers' {v.orders} ({when}).</>;
    case "none": return <><strong>Files no payment report of its own</strong> (another firm routes its orders).</>;
  }
}

export function PaymentLine({ firm, views }: { firm: Firm; views: Group[] }) {
  // the details (where its orders go, its payment rate over time, dollars per quarter) live on the trading-firms page,
  // in this broker's own section; a broker without a payment report of its own has none to show
  const details = views.some((v) => v.pay.kind !== "none");
  return (
    <div className="card bp-line bp-pay">
      <p>{views.map((v) => <span key={v.g} data-g={v.g}>{payText(v)}</span>)}</p>
      {details && (
        <a className="go" href={href(`${pagePath("trading-firms")}#${firm.slug}`)}>
          Details<span className="sr-only"> on what {firm.short} is paid and where its orders go</span><Icon name="arrow" size={20} />
        </a>
      )}
    </div>
  );
}

const BROKERCHECK = "https://brokercheck.finra.org/firm/summary/";

export function TrustLine({ d, firm }: { d: Data; firm: Firm }) {
  const fee = d.fees[firm.id];
  // the account's broker-dealer first (fees.csv); the firms.csv CRD can be a routing affiliate (moomoo's is Futu Clearing's)
  const crd = fee?.crd ?? firm.crd ?? null;
  const sipc = fee?.sipc ?? null;
  return (
    <div className="card bp-line bp-trust">
      <p className="bp-facts">
        <strong className="bp-legal">{firm.name}</strong>
        <span>{crd ? <><Icon name="checkCircle" size={20} />Registered with FINRA</> : "FINRA record not found yet"}</span>
        <span>{sipc === true ? <><Icon name="checkCircle" size={20} />SIPC member</> : sipc === false ? "Not a SIPC member" : "SIPC membership not confirmed"}</span>
      </p>
      {crd
        ? <a className="go" href={BROKERCHECK + crd}>BrokerCheck record<span className="sr-only"> for {firm.short} on FINRA's site</span><Icon name="ext" size={18} /></a>
        : <a className="go" href="https://brokercheck.finra.org/">Search BrokerCheck<span className="sr-only"> on FINRA's site</span><Icon name="ext" size={18} /></a>}
    </div>
  );
}
