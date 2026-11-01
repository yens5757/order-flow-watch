// #/calculator: the full annual-cost estimator, every input exposed, all brokers ranked. The inputs live in the hash
// query (#/calculator?n=24&s=2000&mix=50&o=0&c=5000&m=0&b=HOOD) so a view can be shared, and in localStorage so they stick.
import { useEffect, useState, type ReactNode } from "react";
import Estimator, { loadBroker, loadInputs, saveBroker, saveInputs } from "../components/Estimator";
import { Card, Icon, PageHeader } from "../components/ui";
import { DEFAULT_INPUTS, type CostInputs } from "../lib/cost";
import type { Data } from "../lib/data";
import { dayLong, monthLong } from "../lib/format";
import { readQuery, writeQuery } from "../lib/hooks";

const KEYS: [keyof CostInputs, string][] = [["trades", "n"], ["size", "s"], ["spMix", "mix"], ["options", "o"], ["idleCash", "c"], ["margin", "m"]];

/** True when the hash query carries any calculator input. */
const hasInputs = (p: URLSearchParams) => KEYS.some(([, key]) => p.has(key));

/** The inputs a link describes. A link only lists what differs from the defaults (see `query`), so a key it leaves out
 *  means the default, never the recipient's own last inputs; those are used only for a bare #/calculator. */
function fromUrl(): CostInputs {
  const p = readQuery();
  const out = hasInputs(p) ? { ...DEFAULT_INPUTS } : loadInputs();
  for (const [field, key] of KEYS) {
    const v = Number(p.get(key));
    if (p.has(key) && Number.isFinite(v) && v >= 0) out[field] = v;
  }
  out.spMix = Math.min(100, out.spMix);
  return out;
}

/** The broker named in the URL (#/calculator?b=FIBS, as broker pages link it) when it is one we track, else the visitor's last pick. */
function brokerFromUrl(d: Data): string {
  const b = readQuery().get("b");
  return b && d.byId[b]?.type === "broker" ? b : loadBroker();
}

/** The hash query for a set of inputs and a broker: only the inputs that differ from the defaults. */
const query = (inp: CostInputs, broker: string) =>
  ({ ...Object.fromEntries(KEYS.map(([field, key]) => [key, inp[field] !== DEFAULT_INPUTS[field] ? inp[field] : null])), b: broker });

function Line({ label, children }: { label: string; children: ReactNode }) {
  return <li className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-ink">{label}</span><span>{children}</span></li>;
}

export default function Calculator({ d }: { d: Data }) {
  const [inp, setInp] = useState<CostInputs>(fromUrl);
  const [broker, setBroker] = useState(() => brokerFromUrl(d));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    writeQuery(query(inp, broker));
    saveInputs(inp);
    saveBroker(broker);
  }, [inp, broker]);

  // the page and the address bar stay in step on a same-route hash change too: a link with inputs (a shared view, the
  // back button) loads them, and the bare nav link to #/calculator gets the current inputs written back into the URL
  useEffect(() => {
    const on = () => {
      if (!/^#\/calculator(\?|$)/.test(location.hash)) return;
      const p = readQuery();
      if (hasInputs(p) || p.has("b")) { setInp(fromUrl()); setBroker(brokerFromUrl(d)); }
      else writeQuery(query(inp, broker));
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, [d, inp, broker]);

  const copy = () => {
    // built from the inputs, not from location.href, so the link always carries the view on screen
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query(inp, broker))) if (v != null) p.set(k, String(v));
    const url = `${location.origin}${location.pathname}#/calculator?${p}`;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => window.prompt("Copy this link", url));
    else window.prompt("Copy this link", url);
  };
  const checked = d.meta.feesChecked ? `checked on ${dayLong(d.meta.feesChecked)}` : "not yet checked";

  return (
    <div className="rise">
      <PageHeader eyebrow="Calculator" title="What does your broker cost you per year?"
        sub="Tell us how you trade and see the yearly cost at every broker: the price of the fills, commissions, options fees, idle cash and margin."
        right={
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink hover:border-accent">
            <Icon name={copied ? "check" : "ext"} size={16} />{copied ? "Link copied" : "Copy link"}
          </button>
        } />
      <Estimator d={d} value={inp} onChange={setInp} broker={broker} onBroker={setBroker} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="How this is calculated" sub="Five parts, added up">
          <ul className="space-y-3 text-[14px] leading-relaxed text-ink2">
            <Line label="Fills">
              Every broker must report, by law, how far from the fair price its customers' market orders were filled (SEC Rule 605; we use {monthLong(d.meta.month)}).
              We take that share of the spread for orders of your size, apply it to half the typical quoted spread, and multiply by what you trade in a year.
              Big-company (S&P 500) and other stocks are worked out separately and blended by your mix.
            </Line>
            <Line label="Commissions">Trades per year × the broker's commission per stock trade.</Line>
            <Line label="Options fees">Contracts per year × the broker's fee per contract. Only the fee: how well options orders are filled is not reported anywhere. A broker with no options trading at all is marked "options (not offered)".</Line>
            <Line label="Idle cash">Cash sitting idle × the interest you give up vs the best-paying broker. The broker with the highest verified rate shows $0; the others show the difference.</Line>
            <Line label="Margin">Borrowed × the broker's standard margin interest rate on a $25,000 loan; new-account and promotional rates are left out.</Line>
          </ul>
          <div className="tnum mt-4 rounded-xl bg-surface2 p-4 text-[13px] leading-relaxed text-ink">
            total = trades × size × cost per $ traded<br />
            &nbsp;&nbsp;+ trades × commission<br />
            &nbsp;&nbsp;+ contracts × options fee<br />
            &nbsp;&nbsp;+ idle cash × (best yield − this broker's yield)<br />
            &nbsp;&nbsp;+ borrowed × margin rate
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Fees come from each broker's own fee pages, {checked}. When a fee could not be verified, that part is left out and the row says so: a missing number is not a $0.
          </p>
        </Card>

        <Card title="What this leaves out" sub="Real costs the data can't see">
          <ul className="space-y-3 text-[14px] leading-relaxed text-ink2">
            <Line label="Options fills">Rule 605 covers stocks only. Options are most of what brokers are paid for, but how well those orders are filled is not reported.</Line>
            <Line label="Limit orders">Only market orders are counted. A limit order that waits for your price is a different trade, and its quality is measured differently.</Line>
            <Line label="Taxes">Account type, holding period and tax-loss harvesting can matter far more than any number here.</Line>
            <Line label="Promotions">Sign-up bonuses, free stock, transfer bonuses and temporary fee waivers are not counted; neither are higher-tier memberships with better rates.</Line>
            <Line label="Everything else">Fund expense ratios, currency conversion, inactivity and account fees, and what a broker's app or research is worth to you.</Line>
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            These are estimates, not advice. The fill numbers are one month of each broker's own report; fees change without notice.
            See <a href="#/method" className="font-semibold text-accent">how we measure</a> for the full method.
          </p>
        </Card>
      </div>
    </div>
  );
}
