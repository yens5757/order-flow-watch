// Two short cards at the foot of the right-hand column, as the broker page's one-liners say them for one broker: what
// trading firms paid each broker for its customers' orders (Rule 606, the quarter named, a late filer's previous quarter
// named as such, "Details" opening the broker's section on the trading-firms page), and who each is registered as (FINRA
// BrokerCheck, SIPC).
import { money, payAmount, payWhen, type Pay } from "../../lib/broker";
import type { Data, Filters, Firm } from "../../lib/data";
import { quarterLong } from "../../lib/format";
import { METRICS } from "../../lib/metrics";
import { href, pagePath } from "../../lib/routes";
import { Card, Icon } from "../ui";
import { ordersWord, stocksWord } from "./pair";

/** The amount the row shows, in words only where a number would mislead ("Pays $0.07" rather than a minus sign). */
function amount(p: Pay): string {
  const v = (x: number | null) => (x != null ? money(Math.abs(x)) : `${Math.abs(p.cph ?? 0).toFixed(1)}¢ per 100 shares`);
  switch (p.kind) {
    case "paid": return v(p.v);
    case "pays": return `Pays ${v(p.v)}`;
    case "zero": case "fees": return "Not paid";
    case "missing": return "Not reported";
    case "none": return "No report";
  }
}
/** The row's note under the name: what the word means, and a late filer's quarter. */
function note(p: Pay): string | null {
  const late = p.fallback ? `from ${payWhen(p)}` : null;
  switch (p.kind) {
    case "pays": return `pays its trading firm rather than being paid${late ? `; ${late}` : ""}`;
    case "fees": return `pays about ${payAmount(p)} in exchange fees${late ? `; ${late}` : ""}`;
    case "missing": return "not in this quarter's payment report for these orders";
    case "none": return "files no payment report of its own (another firm routes its orders)";
    default: return late;
  }
}

export function PayCard({ f, pays }: { f: Filters; pays: [Firm, Pay][] }) {
  return (
    <Card title="What each is paid" className="cmp-pay" info={METRICS.pay10k.desc} infoTopic="what each is paid"
      sub={<>Per $10,000 of {ordersWord(f.ot)} in {stocksWord(f.sp)}, <span className="cmp-nw">{quarterLong(f.quarter)}</span></>}>
      <dl className="cmp-rows cmp-pay-rows">
        {pays.map(([F, p]) => (
          <div key={F.id}>
            <dt>{F.short}{note(p) && <small>{note(p)}</small>}</dt>
            <dd>
              <span className={p.kind === "missing" || p.kind === "none" ? "unknown" : undefined}>{amount(p)}</span>
              {p.kind !== "none" && (
                <a className="go" href={href(`${pagePath("trading-firms")}#${F.slug}`)}>
                  Details<span className="sr-only"> on what {F.short} is paid and where its orders go</span><Icon name="arrow" size={18} />
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const BROKERCHECK = "https://brokercheck.finra.org/firm/summary/";

export function TrustCard({ d, firms }: { d: Data; firms: Firm[] }) {
  return (
    <Card title="Registration" className="cmp-reg" sub="Regulator records, not an endorsement" infoTopic="registration"
      info="FINRA's BrokerCheck lists a broker's licences, history and any disciplinary actions. SIPC returns your securities and cash (up to $500,000) if the broker fails; it doesn't cover investment losses.">
      <ul className="cmp-reg-list">
        {firms.map((F) => {
          const fee = d.fees[F.id];
          // the account's broker-dealer first (fees.csv); the firms.csv CRD can be a routing affiliate
          const crd = fee?.crd ?? F.crd ?? null;
          const sipc = fee?.sipc ?? null;
          return (
            <li key={F.id}>
              <p className="cmp-reg-nm"><strong>{F.short}</strong><small>{F.name}</small></p>
              {crd
                ? <a className="go" href={BROKERCHECK + crd}>BrokerCheck<span className="sr-only"> record for {F.short} on FINRA's site</span><Icon name="ext" size={18} /></a>
                : <a className="go" href="https://brokercheck.finra.org/">Search BrokerCheck<span className="sr-only"> for {F.short} on FINRA's site</span><Icon name="ext" size={18} /></a>}
              <p className="cmp-facts">
                <span>{crd ? <><Icon name="checkCircle" size={20} />Registered with FINRA</> : "FINRA record not found yet"}</span>
                <span>{sipc === true ? <><Icon name="checkCircle" size={20} />SIPC member</> : sipc === false ? "Not a SIPC member" : "SIPC membership not confirmed"}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
