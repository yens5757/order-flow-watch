// Renders the link-preview card: web/public/og.png (1280x640, the og:image) and docs/social-preview.png (the README
// banner: the same image). GitHub's own social preview is a separate hand upload of that file (repo Settings).
//
//   PLAYWRIGHT_CORE=<path to an installed playwright-core package> node scripts/og.mjs
//
// Playwright is not a dependency of this site. The script borrows any installed copy of playwright-core through a
// plain CommonJS require of the path in PLAYWRIGHT_CORE and drives the Edge channel ("msedge"), which Windows
// machines already have. The card's numbers come from public/data/site.json when it exists (run build_site.py
// first); otherwise the September 2026 values below are used, so the card renders from a fresh checkout too.
// The card is the site's own world (DESIGN.md): the sage ground, a white card, Figtree from the site's own package
// (embedded, so it renders offline; system fonts if node_modules is missing), ink and secondary ink, every broker on
// one neutral rail with an ink dot and the typical broker's tick, "below" in words, no colour for good or bad.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = [resolve(web, "public/og.png"), resolve(web, "../docs/social-preview.png")];

// keep in step with src/lib/site.ts (a TypeScript module, which node cannot import here)
const SITE_NAME = "Fills and Fees";
const TAGLINE = "Broker comparison with nothing to sell";
const SITE_URL = process.env.VITE_SITE_URL || "https://fillsandfees.com/";
const HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

// $ above the fair (midpoint) price per $10,000 traded, S&P 500 market orders under $200k, September 2026 prices
const FALLBACK = {
  month: "202609", brokers: 25, median: 0.96,
  groups: [[["Fidelity", -0.09], ["J.P. Morgan", -0.08], ["Vanguard", 0.04]], [["Robinhood", 0.82], ["Webull", 1.02]], [["Cash App", 1.73], ["eToro", 1.77]]],
};

/** The three cheapest brokers, Robinhood and Webull (the brokers people ask about), and the two most expensive. */
function fromSiteJson() {
  const file = resolve(web, "public/data/site.json");
  if (!existsSync(file)) return null;
  const d = JSON.parse(readFileSync(file, "utf8"));
  const ix = Object.fromEntries(d.execCols.map((c, i) => [c, i]));
  const brokers = new Map(d.firms.filter((f) => f.type === "broker").map((f) => [f.id, f.short]));
  const all = [];
  for (const r of d.exec) {
    if (!brokers.has(r[ix.id]) || r[ix.m] !== d.meta.month || r[ix.sp] !== "Y" || r[ix.ot] !== "M" || r[ix.b] !== 199999) continue;
    const efq = r[ix.efq], qs = r[ix.qs];
    if (efq == null || qs == null) continue;
    all.push([brokers.get(r[ix.id]), (efq * qs * 1e4) / 2]); // share of the quoted spread x half the spread in bps = $ per $10,000
  }
  all.sort((a, b) => a[1] - b[1]);
  if (all.length < 7) return null;
  const ends = [...all.slice(0, 3), ...all.slice(-2)];
  const named = ["Robinhood", "Webull"].map((n) => all.find((x) => x[0] === n)).filter((x) => x && !ends.includes(x));
  const mid = all.map((x) => x[1]).sort((a, b) => a - b);
  return {
    month: d.meta.month, brokers: all.length, median: mid.length % 2 ? mid[(mid.length - 1) / 2] : (mid[mid.length / 2 - 1] + mid[mid.length / 2]) / 2,
    groups: [all.slice(0, 3), named, all.slice(-2)].filter((g) => g.length),
  };
}

/** Figtree (variable weight) from @fontsource-variable/figtree as data: URLs, or none when node_modules is missing. */
function figtree() {
  const dir = resolve(web, "node_modules/@fontsource-variable/figtree/files");
  const face = (file, range) => {
    const p = resolve(dir, file);
    if (!existsSync(p)) return "";
    return `@font-face { font-family: "Figtree"; font-weight: 300 900; font-style: normal;
      src: url(data:font/woff2;base64,${readFileSync(p).toString("base64")}) format("woff2"); unicode-range: ${range}; }`;
  };
  return face("figtree-latin-wght-normal.woff2", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD")
    + face("figtree-latin-ext-wght-normal.woff2", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF");
}

const card = fromSiteJson() ?? FALLBACK;
const monthLabel = new Date(Number(card.month.slice(0, 4)), Number(card.month.slice(4)) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
const shown = card.groups.flat().map((x) => x[1]);
const lo = Math.min(0, ...shown), hi = Math.max(...shown, card.median);
const at = (v) => ((100 * (v - lo)) / (hi - lo)).toFixed(2);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// as on the site: a price below the fair price says so in words, never with a minus sign
const usd = (v) => `$${Math.abs(v).toFixed(2)}${v < -0.005 ? "<small> below</small>" : ""}`;
const row = ([name, v]) =>
  `<div class="row"><span class="n">${esc(name)}</span><span class="rail"><i class="dot" style="left:${at(v)}%"></i></span><span class="v">${usd(v)}</span></div>`;
const rows = card.groups.map((g) => g.map(row).join("")).join('<div class="gap"></div>');
const check = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#55615C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// the site's light tokens (src/index.css): --page, --surface, --ink, --ink-2, --mark, --track, --rule, --lift
const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  ${figtree()}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1280px; height: 640px; overflow: hidden; background: #EDF2F0; color: #374642;
    font-family: Figtree, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { display: grid; grid-template-columns: 1fr 488px; gap: 60px; padding: 0 72px; height: 100%; align-items: center; }
  .brand b { display: block; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
  .brand span { display: block; margin-top: 2px; font-size: 17px; font-weight: 500; color: #55615C; }
  h1 { margin-top: 40px; font-size: 62px; line-height: 1.04; font-weight: 800; letter-spacing: -0.035em; text-wrap: balance; }
  .lead { margin-top: 20px; font-size: 22px; line-height: 1.45; color: #55615C; max-width: 30ch; }
  .promise { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 18px; font-weight: 600; list-style: none; }
  .promise li { display: inline-flex; align-items: center; gap: 7px; }
  .card { background: #FFFFFF; border-radius: 24px; padding: 30px 30px 24px;
    box-shadow: 0 1px 2px rgb(16 40 34 / .05), 0 14px 30px -18px rgb(16 40 34 / .28); }
  .ct { font-size: 21px; font-weight: 700; letter-spacing: -0.01em; }
  .cs { margin-top: 4px; font-size: 15px; color: #55615C; }
  .rows { position: relative; margin-top: 22px; padding-top: 22px; }
  .typ { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px dashed #7C8984;
    left: calc(108px + 14px + (100% - 108px - 116px - 28px) * ${at(card.median)} / 100); }
  .typ span { position: absolute; top: -6px; left: 0; transform: translateX(-50%); white-space: nowrap; font-size: 13px; color: #55615C;
    background: #FFFFFF; padding: 0 6px; }
  .typ b { color: #374642; font-weight: 700; }
  .row { display: grid; grid-template-columns: 108px 1fr 116px; align-items: center; gap: 14px; height: 36px; font-size: 17px; }
  .n { font-weight: 500; white-space: nowrap; }
  .rail { position: relative; height: 4px; border-radius: 2px; background: #E1E9E6; }
  .dot { position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: #374642;
    box-shadow: 0 0 0 3px #FFFFFF; transform: translate(-50%, -50%); z-index: 1; }
  .v { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .v small { font-size: 14px; font-weight: 500; color: #55615C; }
  .gap { height: 1px; background: #D5DEDA; margin: 7px 0; }
  .foot { margin-top: 16px; padding-top: 14px; border-top: 1px solid #E1E8E5; font-size: 14px; color: #55615C; }
</style></head>
<body>
  <div class="wrap">
    <div>
      <div class="brand"><b>${esc(SITE_NAME)}</b><span>${esc(TAGLINE)}</span></div>
      <h1>Is your broker getting you a good price?</h1>
      <p class="lead">The numbers brokers must report by law, read the same way for every broker.</p>
      <ul class="promise"><li>${check}No ads</li><li>${check}No affiliate links</li><li>${check}No money from brokers</li></ul>
    </div>
    <div class="card">
      <div class="ct">Extra cost per $10,000 traded</div>
      <div class="cs">Above the fair price &middot; S&amp;P 500 stocks &middot; market orders</div>
      <div class="rows">
        <div class="typ"><span>Typical <b>$${card.median.toFixed(2)}</b></span></div>
        ${rows}
      </div>
      <div class="foot">${esc(monthLabel)} &middot; ${card.brokers} brokers &middot; ${esc(HOST)}</div>
    </div>
  </div>
</body></html>`;

if (!process.env.PLAYWRIGHT_CORE) {
  console.error("Set PLAYWRIGHT_CORE to the path of an installed playwright-core package, e.g.\n  PLAYWRIGHT_CORE=C:/path/to/node_modules/playwright-core node scripts/og.mjs");
  process.exit(1);
}
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  for (const out of OUT) {
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out });
  }
} finally {
  await browser.close();
}
console.log(`wrote ${OUT.join(" and ")}: ${card.groups.flat().length} of ${card.brokers} brokers, ${monthLabel} prices`);
