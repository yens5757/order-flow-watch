// What the broker charges, from its own published pages (fees.csv): one row per fee, with the page it was read from and
// the date it was checked. A fee nobody could confirm says "Not confirmed", a product the broker doesn't offer "Not
// offered", a rate that depends on a tier or a program "Varies": never $0 for something unknown.
import type { Data, Fee, FeeKey, Firm } from "../../lib/data";
import { dayLong, pct } from "../../lib/format";
import { METRICS } from "../../lib/metrics";
import { Icon } from "../ui";

/** Fee dollars: whole amounts without cents ($0, $75), otherwise two decimals ($0.65, $49.95). */
const dollars = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
/** A rate as published: two decimals, three when the broker publishes three (11.575%), never rounded away. */
const rate = (v: number) => pct(v, Math.min(3, Math.max(2, (String(v).split(".")[1] ?? "").length)));
/** A URL's host without "www." and its registrable name: "us.etrade.com" → etrade, "cash.app" → cash. */
function site(u: string): { host: string; name: string } | null {
  try {
    const host = new URL(u).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    return { host, name: parts.length > 1 ? parts[parts.length - 2] : parts[0] };
  } catch { return null; }
}
/** A source is the broker's own when its site's name is part of the broker's names (cash.app for Cash App Investing,
 *  interactivebrokers.com for Interactive Brokers LLC); a review site (nerdwallet.com) is not. */
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ownSite = (u: string, firm: Firm) => { const x = site(u); return !!x && x.name.length >= 3 && squash(`${firm.name} ${firm.short} ${firm.slug}`).includes(x.name); };
/** A source URL as a short label: "robinhood.com/us/en/support/articles/…". */
const label = (u: string) => { const s = u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); return s.length > 44 ? `${s.slice(0, 42)}…` : s; };

/** The fees in Compare's words (lib/metrics.ts labels; compare/SideBySide.tsx), so a fee has one name on every page; the
 *  transfer-out note uses the yearly card's words for it ("Moving out: $100"). */
const ROWS: { key: FeeKey; name: string; note?: string; fmt: (v: number) => string }[] = [
  { key: "commission", name: METRICS.commission.label, fmt: dollars },
  { key: "optionsFee", name: METRICS.optionsFee.label, fmt: dollars },
  { key: "marginRate", name: METRICS.marginRate.label, note: "on a $25,000 loan", fmt: rate },
  { key: "cashYield", name: METRICS.cashYield.label, note: "standard account", fmt: rate },
  { key: "transferOut", name: "Transfer-out fee", note: "moving your whole account out", fmt: dollars },
];

const CONFIDENCE: Record<Fee["confidence"], string | null> = {
  high: null,
  medium: "Partly confirmed on the broker's own pages.",
  low: "Not yet confirmed on the broker's own pages.",
};

export function FeesCard({ d, firm }: { d: Data; firm: Firm }) {
  const fee: Fee | undefined = d.fees[firm.id];
  if (!fee) return null;
  const checked = fee.checked || d.meta.feesChecked;
  // BrokerCheck lookups back the registration line, not the fees
  const sources = fee.sources.filter((u) => !/brokercheck/i.test(u));
  // the first page on the broker's own site leads; the label says whose page it is ("Source: nerdwallet.com" otherwise)
  const first = sources.find((u) => ownSite(u, firm)) ?? sources[0];
  const more = sources.filter((u) => u !== first);
  const own = first != null && ownSite(first, firm);
  const firstLabel = !first ? "" : own ? (fee.retail ? `${firm.short}'s price list` : `${firm.short}'s site`) : `Source: ${site(first)?.host ?? label(first)}`;
  const shown = (k: FeeKey): [string, boolean] => {
    const v = fee[k];
    if (v != null) return [ROWS.find((r) => r.key === k)!.fmt(v), true];
    return [fee.notOffered.includes(k) ? "Not offered" : fee.varies.includes(k) ? "Varies" : "Not confirmed", false];
  };
  const known = ROWS.filter((r) => fee[r.key] != null).length;
  const note = CONFIDENCE[fee.confidence];

  return (
    <section className="card bp-fees" aria-labelledby="fees-h">
      <h2 id="fees-h">Fees</h2>
      <p className="bp-sub bp-src">
        {first
          ? <><a href={first}>{firstLabel}<Icon name="ext" size={16} /></a>, </>
          : <>{firm.short}'s own pages, </>}
        checked <span className="nw">{checked ? dayLong(checked) : "on a date not recorded"}</span>
      </p>
      {!fee.retail ? (
        <p className="bp-note">{firm.short} offers advisor-managed accounts only, with no public price list.</p>
      ) : known === 0 ? (
        <p className="bp-note">No fee confirmed on {firm.short}'s own pages yet.</p>
      ) : (
        <dl className="bp-rows">
          {ROWS.map((r) => {
            const [text, ok] = shown(r.key);
            return (
              <div key={r.key}>
                <dt>{r.name}{r.note && <small>{r.note}</small>}</dt>
                <dd className={ok ? undefined : "unknown"}>{text}</dd>
              </div>
            );
          })}
        </dl>
      )}
      {note && fee.retail && <p className="bp-note">{note}</p>}
      {more.length > 0 && (
        <details className="bp-sources">
          <summary>{more.length} more {more.length > 1 ? "sources" : "source"}<Icon name="down" size={18} /></summary>
          <ul>
            {more.map((u) => <li key={u}><a href={u}>{label(u)}<Icon name="ext" size={14} /></a></li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
