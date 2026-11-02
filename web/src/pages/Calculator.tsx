// calculator/: the full annual-cost estimator, every input exposed, all brokers ranked. The inputs live in the query
// string (calculator/?n=24&s=2000&mix=50&o=0&c=5000&m=0&b=robinhood) so a view can be shared, and in localStorage so they stick.
import { useEffect, useState, type ReactNode } from "react";
import Estimator, { loadBroker, loadInputs, saveBroker, saveInputs } from "../components/Estimator";
import { Card, Icon, PageHeader } from "../components/ui";
import { DEFAULT_INPUTS, type CostInputs } from "../lib/cost";
import { idFromUrl, slugOf, type Data } from "../lib/data";
import { dayLong, monthLong } from "../lib/format";
import { onNavigate, readLocation, readQuery, useBrowserLayoutEffect, writeQuery } from "../lib/hooks";
import { href, pagePath, parseRoute } from "../lib/routes";

const KEYS: [keyof CostInputs, string][] = [["trades", "n"], ["size", "s"], ["spMix", "mix"], ["options", "o"], ["idleCash", "c"], ["margin", "m"]];

/** True when the query carries any calculator input. */
const hasInputs = (p: URLSearchParams) => KEYS.some(([, key]) => p.has(key));

/** The inputs a link describes. A link only lists what differs from the defaults (see `query`), so a key it leaves out
 *  means the default, never the recipient's own last inputs; those (`fallback`) are used only for a bare calculator/. */
function fromUrl(search: string, fallback: CostInputs): CostInputs {
  const p = readQuery(search);
  const out = hasInputs(p) ? { ...DEFAULT_INPUTS } : { ...fallback };
  for (const [field, key] of KEYS) {
    const v = Number(p.get(key));
    if (p.has(key) && Number.isFinite(v) && v >= 0) out[field] = v;
  }
  out.spMix = Math.min(100, out.spMix);
  return out;
}

/** The broker named in the URL (calculator/?b=fidelity, as broker pages link it; older links name a reporter id) when it is one we track. */
function brokerFromUrl(d: Data, search: string): string | null {
  const id = idFromUrl(d, readQuery(search).get("b"));
  return id && d.byId[id].type === "broker" ? id : null;
}

/** The query for a set of inputs and a broker: only the inputs that differ from the defaults. */
const query = (d: Data, inp: CostInputs, broker: string) =>
  ({ ...Object.fromEntries(KEYS.map(([field, key]) => [key, inp[field] !== DEFAULT_INPUTS[field] ? inp[field] : null])), b: slugOf(d, broker) });

function Line({ label, children }: { label: string; children: ReactNode }) {
  return <li className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-ink">{label}</span><span>{children}</span></li>;
}

/** `search`: the query string the page was opened with; later same-page changes arrive through onNavigate. */
export default function Calculator({ d, search }: { d: Data; search: string }) {
  // the link's inputs, or the defaults: the visitor's own last inputs come from localStorage in the effect below, never
  // while rendering (this page also renders on the server)
  const [inp, setInp] = useState<CostInputs>(() => fromUrl(search, DEFAULT_INPUTS));
  const [broker, setBroker] = useState(() => brokerFromUrl(d, search) ?? "HOOD");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useBrowserLayoutEffect(() => {
    if (!hasInputs(readQuery(search))) setInp(loadInputs());
    if (!brokerFromUrl(d, search)) setBroker(loadBroker());
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return; // not before the saved inputs are in, or the defaults would overwrite them
    writeQuery(query(d, inp, broker));
    saveInputs(inp);
    saveBroker(broker);
  }, [d, ready, inp, broker]);

  // the page and the address bar stay in step on a same-page navigation too: a link with inputs (a shared view, the
  // back button) loads them, and the bare nav link to calculator/ gets the current inputs written back into the URL
  useEffect(() => onNavigate(() => {
    const loc = readLocation();
    if (parseRoute(d, loc.path).page !== "calculator") return;
    const p = readQuery(loc.search);
    if (hasInputs(p) || p.has("b")) { setInp(fromUrl(loc.search, loadInputs())); setBroker(brokerFromUrl(d, loc.search) ?? loadBroker()); }
    else writeQuery(query(d, inp, broker));
  }), [d, inp, broker]);

  const copy = () => {
    // built from the inputs, not from location.href, so the link always carries the view on screen
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query(d, inp, broker))) if (v != null) p.set(k, String(v));
    const url = `${location.origin}${href(pagePath("calculator"))}?${p}`;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => window.prompt("Copy this link", url));
    else window.prompt("Copy this link", url);
  };
  const checked = d.meta.feesChecked ? `checked on ${dayLong(d.meta.feesChecked)}` : "not yet checked";

  return (
    <div className="rise">
      <PageHeader eyebrow="Calculator" title="What does your broker cost you per year?"
        sub="Enter how you trade; see the yearly cost at every broker."
        right={
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink hover:border-accent">
            <Icon name={copied ? "check" : "ext"} size={16} />{copied ? "Link copied" : "Copy link"}
          </button>
        } />
      <Estimator d={d} value={inp} onChange={setInp} broker={broker} onBroker={setBroker} />

      <div className="mt-5">
        <Card title="How this is calculated" sub="Five parts, added up">
          <ul className="space-y-3 text-[14px] leading-relaxed text-ink2">
            <Line label="Trade prices">
              Each broker's reported share of the spread for orders of your size (SEC Rule 605, {monthLong(d.meta.month)}) × half the typical spread × what you trade a year, blended by your stock mix.
            </Line>
            <Line label="Commissions">Trades × commission per stock trade.</Line>
            <Line label="Options fees">Contracts × fee per contract (fee only; options prices aren't reported).</Line>
            <Line label="Idle cash">Idle cash × the interest you give up vs the best-paying broker.</Line>
            <Line label="Margin">Borrowed × standard margin rate at $25,000.</Line>
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Fees: each broker's own pages, {checked}. An unverified fee is left out, never counted as $0. Not counted: options prices, resting limit orders, taxes, promotions, fund fees. <a href={href(pagePath("how-we-measure"))} className="font-semibold text-accent">How we measure</a>.
          </p>
        </Card>
      </div>
    </div>
  );
}
