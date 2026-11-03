/// <reference types="vite/client" />
// Path routing, pure: paths in and out, no browser globals, so the same code names every link on the client and
// in the pre-render. Every page path is relative to the Vite base (import.meta.env.BASE_URL, ends with "/") and
// ends with "/": "" home · "compare/" · "compare/<a>-vs-<b>/" · "calculator/" · "brokers/" (the explorer, its
// state in the query string) · "brokers/<slug>/" · "trading-firms/" · "firms/" · "how-we-measure/".
import { asData, brokerRows, metric, type Data, type Filters, type Firm, type Raw } from "./data";
import { monthLong, usd2 } from "./format";
import { METRICS, type MetricKey } from "./metrics";
import { SITE_NAME, SITE_URL } from "./site";

/** The Vite base, always ending with "/". */
export const BASE: string = (() => { const b = import.meta.env.BASE_URL || "/"; return b.endsWith("/") ? b : `${b}/`; })();

/** The href of an internal link: the base plus a page path (with any query), used for EVERY internal <a href>. */
export const href = (path: string) => BASE + path.replace(/^\/+/, "");

export type PageName = "home" | "compare" | "calculator" | "brokers" | "trading-firms" | "firms" | "how-we-measure";
export const pagePath = (name: PageName) => (name === "home" ? "" : `${name}/`);
export const brokerPath = (slug: string) => `brokers/${slug}/`;
/** The comparison page of two brokers, in its one canonical order (alphabetical by slug), whichever order is given. */
export const comparePath = (slugA: string, slugB: string) => { const [a, b] = slugA <= slugB ? [slugA, slugB] : [slugB, slugA]; return `compare/${a}-vs-${b}/`; };
/** Two firms in the order their comparison page shows them (the canonical order). */
export const pairOrder = <T extends { slug: string }>(a: T, b: T): [T, T] => (a.slug <= b.slug ? [a, b] : [b, a]);

/** The comparison "compare/" opens with: Robinhood and Fidelity (the first two brokers when either is missing). */
export const DEFAULT_PAIR = ["HOOD", "FIBS"];
export const defaultPair = (d: Data): [Firm, Firm] =>
  pairOrder(d.byId[DEFAULT_PAIR[0]] ?? d.brokers[0], d.byId[DEFAULT_PAIR[1]] ?? d.brokers[1] ?? d.brokers[0]);

export type Route =
  | { page: "home" }
  | { page: "brokers" }
  | { page: "broker"; firm: Firm }
  /** `explicit`: the pair is in the path ("compare/a-vs-b/"); "compare/" shows the default pair and is its own page */
  | { page: "compare"; a: Firm; b: Firm; explicit: boolean }
  | { page: "calculator" }
  | { page: "trading-firms" }
  | { page: "firms" }
  | { page: "how-we-measure" };

/** First path segments this app answers to, the old names included (they redirect to the new ones). */
const KNOWN = new Set(["compare", "calculator", "brokers", "trading-firms", "firms", "how-we-measure", "explore", "market-makers", "method", "broker"]);
const segments = (path: string) => path.split("?")[0].split("/").filter(Boolean);

/** A firm by slug, or by its reporter id for links written before slugs existed. */
const firmOf = (d: Data, s: string | undefined): Firm | undefined => (s ? d.bySlug[s] ?? d.byId[s] ?? d.byId[s.toUpperCase()] : undefined);

/** The page a path names. Unknown paths and firms fall back the way the hash router did: home, the first broker, the default pair. */
export function parseRoute(data: Data, path: string): Route {
  const d = asData(data);
  const segs = segments(path);
  switch (segs[0]) {
    case undefined: case "index.html": return { page: "home" };
    case "brokers": case "explore": return segs[1] == null ? { page: "brokers" } : { page: "broker", firm: firmOf(d, segs[1]) ?? d.brokers[0] };
    case "broker": return { page: "broker", firm: firmOf(d, segs[1]) ?? d.brokers[0] };
    case "compare": {
      const seg = segs[1], defs = defaultPair(d);
      if (!seg) return { page: "compare", a: defs[0], b: defs[1], explicit: false };
      const i = seg.indexOf("-vs-");
      const x = i < 0 ? undefined : firmOf(d, seg.slice(0, i)), y = i < 0 ? undefined : firmOf(d, seg.slice(i + 4));
      const [a, b] = pairOrder(x ?? defs[0], y ?? defs[1]);
      return { page: "compare", a, b, explicit: true };
    }
    case "calculator": return { page: "calculator" };
    case "trading-firms": case "market-makers": return { page: "trading-firms" };
    case "firms": return { page: "firms" };
    case "how-we-measure": case "method": return { page: "how-we-measure" };
    default: return { page: "home" };
  }
}

/** The canonical path of a route. */
export function routePath(r: Route): string {
  switch (r.page) {
    case "home": return "";
    case "broker": return brokerPath(r.firm.slug);
    case "compare": return r.explicit ? comparePath(r.a.slug, r.b.slug) : pagePath("compare");
    default: return pagePath(r.page);
  }
}

/** The path this one should be at: null when it is unknown (left alone, rendered as home). */
function canonicalPath(d: Data, path: string): string | null {
  const segs = segments(path);
  if (segs.length && segs[0] !== "index.html" && !KNOWN.has(segs[0])) return null;
  return routePath(parseRoute(d, path));
}

/** Where a URL from before this routing should go, or null when it is already right. Pure, so it can be tested
 *  without a browser; `fixLocation` in hooks.ts applies it with history.replaceState.
 *  - a hash route (#/, #/explore?m=…, #/brokers, #/broker/HOOD, #/compare/HOOD/FIBS, #/market-makers, #/method,
 *    #/firms, #/calculator?b=HOOD) becomes the new path and query, reporter ids turned into slugs;
 *  - the old path names (explore/, market-makers/, method/, broker/<id>/), index.html, a missing trailing slash and a
 *    comparison in the other order become their canonical path. */
export function normalizeLocation(data: Data, path: string, search: string, hash: string): { path: string; search: string } | null {
  const d = asData(data);
  if (hash.startsWith("#/")) {
    const [p, q = ""] = hash.slice(2).split("?");
    const segs = p.split("/").filter(Boolean);
    const query = new URLSearchParams(q);
    const slug = (id: string | undefined) => (id && d.byId[id] ? d.byId[id].slug : null);
    let to = "";
    switch (segs[0]) {
      case "explore": case "brokers": {
        to = pagePath("brokers");
        const ex = query.get("ex");
        if (ex) query.set("ex", ex.split(",").filter(Boolean).map((x) => slug(x) ?? x).join(","));
        break;
      }
      case "broker": to = brokerPath(slug(segs[1]) ?? d.brokers[0].slug); break;
      case "compare": { const a = slug(segs[1]), b = slug(segs[2]); to = a && b ? comparePath(a, b) : pagePath("compare"); break; }
      case "calculator": { to = pagePath("calculator"); const b = query.get("b"); if (b) query.set("b", slug(b) ?? b); break; }
      case "market-makers": to = pagePath("trading-firms"); break;
      case "method": to = pagePath("how-we-measure"); break;
      case "firms": to = pagePath("firms"); break;
      default: to = "";
    }
    const qs = query.toString();
    return { path: to, search: qs ? `?${qs}` : "" };
  }
  const want = canonicalPath(d, path);
  return want != null && want !== path ? { path: want, search } : null;
}

const HOME_DESCRIPTION = "Which US brokers get you the best price on a trade, from the reports they must publish by law (SEC Rules 605 and 606). Updated weekly.";

/** <title>, meta description and canonical URL per page, so search results and shared links say what the page is about.
 *  The title ends with " · Fills and Fees" except on home. */
export function describeRoute(data: Data | Raw, path: string, search: string): { title: string; description: string; canonical: string } {
  const d = asData(data);
  const r = parseRoute(d, path);
  const canonical = SITE_URL + routePath(r);
  if (r.page === "home") return { title: `${SITE_NAME}: is your broker getting you a good price?`, description: HOME_DESCRIPTION, canonical };
  // descriptions are what a search result shows under the title: each page carries its own numbers where it has them
  const s: Filters = { sp: "Y", ot: "M", b: 199999, month: d.meta.month, quarter: d.meta.quarter, clearing: false };
  const when = monthLong(d.meta.month);
  const fair = (v: number) => `${usd2(Math.abs(v))} ${v < 0 ? "below" : "above"} the fair price`;
  const cost = (f: Firm) => metric(d, f, s).cost10k;
  let text: string, description: string;
  switch (r.page) {
    case "brokers": {
      // a linked explorer view names its measure; the bare page (and the pre-rendered one) names the page
      const m = new URLSearchParams(search).get("m");
      const M = m && m in METRICS ? METRICS[m as MetricKey] : null;
      text = M ? `${M.label}: every US broker compared` : "Compare US brokers: the prices they get you, their fees and what they are paid";
      description = "Every US broker's trade prices, payments and fees in one sortable table, from the reports they must publish by law.";
      break;
    }
    case "broker": {
      text = `${r.firm.short} prices and fees: what a $10,000 trade really costs`;
      const c = cost(r.firm);
      const ranked = brokerRows(d, s).filter((x) => x.cost10k != null).sort((x, y) => x.cost10k! - y.cost10k!);
      const rank = ranked.findIndex((x) => x.id === r.firm.id) + 1;
      description = c == null
        ? `${r.firm.short}: its fees, who fills its orders and what it is paid for them, from the reports US brokers must publish.`
        : `${r.firm.short} customers paid ${fair(c)} per $10,000 traded in ${when}${rank ? ` (#${rank} of ${ranked.length})` : ""}. Its fees, who fills its orders and what it is paid.`;
      break;
    }
    // the bare "compare/" page (the nav link) is a page of its own, not a second copy of the default pair's page
    case "compare": {
      text = r.explicit ? `${r.a.short} vs ${r.b.short}: prices, fees and what you'd pay` : "Compare two US brokers side by side: prices, fees and what you'd pay";
      const ca = cost(r.a), cb = cost(r.b);
      description = !r.explicit
        ? "Pick any two of 25 US brokers and compare trade prices, fees, payment for order flow and registration side by side."
        : ca != null && cb != null
          ? `${when}, per $10,000 traded: ${r.a.short} customers paid ${fair(ca)}, ${r.b.short} customers ${usd2(Math.abs(cb))} ${cb < 0 ? "below" : "above"}. Fees and yearly cost compared.`
          : `${r.a.short} vs ${r.b.short}: trade prices, fees, payment for order flow and registration side by side.`;
      break;
    }
    case "calculator":
      text = "Brokerage cost calculator: what your broker costs you per year";
      description = "Enter how you trade and see what each US broker would cost you a year: trade prices, commissions, options fees, idle cash and margin.";
      break;
    case "trading-firms":
      text = "Which trading firms handle retail orders, and how good their prices are";
      description = "Which trading firms fill each broker's orders (Citadel, Virtu, Jane Street and others) and how good their prices are on the same stocks and order sizes.";
      break;
    case "how-we-measure":
      text = "How we measure brokers";
      description = "Where the numbers come from (SEC Rules 605 and 606), what share of the spread means, and what the data can't show.";
      break;
    case "firms":
      text = "Every firm that publishes a monthly price report (SEC Rule 605)";
      description = "Every firm that publishes a monthly SEC Rule 605 price report, with the share of the spread its customers paid.";
      break;
  }
  return { title: `${text} · ${SITE_NAME}`, description, canonical };
}
