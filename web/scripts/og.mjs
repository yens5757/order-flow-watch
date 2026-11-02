// Renders the link-preview card: web/public/og.png (1280x640, the og:image and the GitHub social preview) and
// docs/social-preview.png (the README banner: the same image).
//
//   PLAYWRIGHT_CORE=<path to an installed playwright-core package> node scripts/og.mjs
//
// Playwright is not a dependency of this site. The script borrows any installed copy of playwright-core through a
// plain CommonJS require of the path in PLAYWRIGHT_CORE and drives the Edge channel ("msedge"), which Windows
// machines already have. The card's numbers come from public/data/site.json when it exists (run build_site.py
// first); otherwise the September 2026 values below are used, so the card renders from a fresh checkout too.
// Fonts come from Google Fonts when the machine is online, else the system fallbacks.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = [resolve(web, "public/og.png"), resolve(web, "../docs/social-preview.png")];

// keep in step with src/lib/site.ts (a TypeScript module, which node cannot import here)
const SITE_NAME = "Fills and Fees";
const SITE_URL = process.env.VITE_SITE_URL || "https://fillsandfees.com/";
const HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

// $ above the fair (midpoint) price per $10,000 traded, S&P 500 market orders under $200k, September 2026 fills
const FALLBACK = {
  month: "202609", brokers: 25, median: 0.96,
  groups: [[["Fidelity", -0.09], ["Vanguard", 0.04], ["Schwab", 0.08]], [["Robinhood", 0.82], ["Webull", 1.02]], [["Cash App", 1.73], ["eToro", 1.77]]],
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

const card = fromSiteJson() ?? FALLBACK;
const monthLabel = new Date(Number(card.month.slice(0, 4)), Number(card.month.slice(4)) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
const max = Math.max(...card.groups.flat().map((x) => x[1]));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const usd = (v) => (v < 0 ? "\u2212" : "") + "$" + Math.abs(v).toFixed(2);
const row = ([name, v]) =>
  `<div class="row"><span class="n">${esc(name)}</span><span><div class="bar" style="width:${Math.max(2, (100 * Math.max(0, v)) / max)}%;background:${v <= card.median ? "#3987e5" : "#e66767"}"></div></span><span class="v">${usd(v)}</span></div>`;
const rows = card.groups.map((g) => g.map(row).join("")).join('<div class="gap"></div>');

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1280px; height: 640px; overflow: hidden; background: #0b0e14; color: #eceef3; font-family: Inter, system-ui, sans-serif; position: relative; }
  .glow { position: absolute; inset: 0;
    background: radial-gradient(620px 420px at 8% 0%, rgba(79,124,255,.30), transparent 70%),
                radial-gradient(560px 420px at 100% 100%, rgba(157,107,255,.26), transparent 70%); }
  .dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(236,238,243,.10) 1px, transparent 1px); background-size: 22px 22px;
    mask-image: linear-gradient(to bottom right, #000, transparent 75%); }
  .wrap { position: relative; display: grid; grid-template-columns: 1fr 470px; gap: 56px; padding: 64px 72px; height: 100%; align-items: center; }
  .brand { display: flex; align-items: center; gap: 14px; font: 700 26px "Plus Jakarta Sans", Inter, system-ui, sans-serif; }
  .logo { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(120deg,#4f7cff,#9d6bff); display: grid; place-items: center; }
  h1 { margin-top: 38px; font: 800 62px/1.04 "Plus Jakarta Sans", Inter, system-ui, sans-serif; letter-spacing: -0.03em; }
  .grad { background: linear-gradient(120deg,#7ea2ff,#b392ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin-top: 22px; font-size: 22px; line-height: 1.45; color: #b5bcc9; max-width: 600px; }
  .tags { margin-top: 30px; display: flex; gap: 10px; flex-wrap: wrap; }
  .tag { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); border-radius: 999px; padding: 7px 14px; font-size: 15px; color: #b5bcc9; }
  .card { background: #131821; border: 1px solid rgba(255,255,255,.09); border-radius: 22px; padding: 28px 28px 22px; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
  .ct { font-size: 18px; font-weight: 600; }
  .cs { font-size: 14px; color: #8790a2; margin-top: 4px; }
  .row { display: grid; grid-template-columns: 104px 1fr 64px; align-items: center; gap: 12px; margin-top: 15px; font-size: 16px; }
  .row .n { color: #b5bcc9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar { height: 14px; border-radius: 0 5px 5px 0; }
  .v { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .gap { height: 1px; background: rgba(255,255,255,.08); margin: 16px 0 2px; }
  .foot { font-size: 13px; color: #8790a2; margin-top: 16px; }
</style></head>
<body>
  <div class="glow"></div><div class="dots"></div>
  <div class="wrap">
    <div>
      <div class="brand"><span class="logo"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l5-5 4 4 7-8"/></svg></span>${esc(SITE_NAME)}</div>
      <h1>Is your broker getting you a <span class="grad">good price?</span></h1>
      <p class="sub">What your broker's trades really cost, from the reports US brokers must publish by law. Updated every week.</p>
      <div class="tags"><span class="tag">SEC Rules 605 &amp; 606</span><span class="tag">${card.brokers} US brokers</span><span class="tag">Free, no sign-up</span></div>
    </div>
    <div class="card">
      <div class="ct">Extra cost on a $10,000 trade</div>
      <div class="cs">Above the fair price &middot; S&amp;P 500 market orders</div>
      ${rows}
      <div class="foot">${esc(monthLabel)} prices &middot; ${esc(HOST)}</div>
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
