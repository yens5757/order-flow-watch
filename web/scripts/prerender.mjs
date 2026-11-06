// Pre-renders every page of the site into dist/ after `vite build` (`npm run build` runs both):
//   1. builds src/entry-server.tsx for Node into dist-ssr/ (the same as `vite build --ssr`),
//   2. renders each page with the data in public/data/site.json and writes dist/<path>index.html, so crawlers and
//      link previews see the content and the app (main.tsx) takes over once it has fetched the data,
//   3. writes dist/404.html (the shell GitHub Pages serves for unknown paths: no page content, just the loader),
//      dist/sitemap.xml and dist/robots.txt.
// Runs on Windows and Linux. SITE_BASE (vite.config.ts) and VITE_SITE_URL, both set in .github/workflows/weekly.yml,
// say where the site lives; the defaults are the GitHub Pages address.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(web, "dist");
const ssrDir = join(web, "dist-ssr");
const DEFAULT_SITE_URL = "https://fillsandfees.com/";
const SITE_URL = (process.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/*$/, "/");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- the client build this adds to
const templateFile = join(dist, "index.html");
if (!existsSync(templateFile)) throw new Error(`${templateFile} is missing: run "vite build" first`);
const template = readFileSync(templateFile, "utf8");
for (const mark of ["<!--app-head-->", "<!--app-html-->"]) {
  if (!template.includes(mark)) throw new Error(`index.html has no ${mark} placeholder`);
}
const siteFile = join(web, "public", "data", "site.json");
if (!existsSync(siteFile)) throw new Error(`${siteFile} is missing: run build_site.py first`);
const raw = JSON.parse(readFileSync(siteFile, "utf8"));

// ---- 1. the server bundle (react-dom/server picks its production build from NODE_ENV)
process.env.NODE_ENV ??= "production";
await build({ root: web, logLevel: "warn", publicDir: false, build: { ssr: "src/entry-server.tsx", outDir: "dist-ssr", emptyOutDir: true } });
const entry = readdirSync(ssrDir).find((f) => /^entry-server\.m?js$/.test(f));
if (!entry) throw new Error(`no entry-server.js in ${ssrDir}`);
const { render, toData, SITE_NAME = "Fills and Fees" } = await import(pathToFileURL(join(ssrDir, entry)).href);

// ---- 2. the routes, from the firms as the app sees them: build_site.py writes firms[].slug, and until it has been
// re-run buildData (lib/data.ts) derives the slug from the short name by the same rule (robinhood, jp-morgan, etrade,
// cash-app). A comparison's canonical order is alphabetical by slug, so the sorted list gives every pair once.
const data = toData(raw);
const brokers = data.brokers.map((f) => f.slug).sort();
const pairs = [];
for (let i = 0; i < brokers.length; i++) for (let j = i + 1; j < brokers.length; j++) pairs.push(`compare/${brokers[i]}-vs-${brokers[j]}/`);
const profiles = data.firms.map((f) => `brokers/${f.slug}/`);
const pages = ["", "compare/", "calculator/", "brokers/", "trading-firms/", "firms/", "how-we-measure/"];
const routes = [...pages, ...profiles, ...pairs];

// ---- 3. one file per page: the template minus its generic title/description/og tags (the page's own go in at
// <!--app-head-->) and minus the loader (the page's HTML goes in at <!--app-html-->)
// link previews (Discord, LinkedIn, Slack...) cache an image by its address: the file's hash in the query makes a redrawn
// card a new address, so no app keeps showing the old one
const ogHash = createHash("sha256").update(readFileSync(join(web, "public", "og.png"))).digest("hex").slice(0, 8);
const withImage = (t) => t.replace(/(property="og:image" content=")[^"]*"/, `$1${esc(SITE_URL)}og.png?v=${ogHash}"`);
const pageTemplate = withImage(template)
  .replace(/^[ \t]*<title>.*<\/title>[ \t]*\r?\n/m, "")
  .replace(/^[ \t]*<meta (?:name="description"|property="og:(?:title|url|description)") [^>]*>[ \t]*\r?\n/gm, "")
  .replace(/<div id="app-loading"[\s\S]*?<\/div>/, "");
const offCanon = [];
for (const path of routes) {
  let page;
  try {
    page = render(path, "", data);
  } catch (e) {
    throw new Error(`rendering ${path || "the home page"} failed: ${e?.stack ?? e}`);
  }
  if (page.canonical && page.canonical !== SITE_URL + path) offCanon.push(`${path || "(home)"} -> ${page.canonical}`);
  const html = pageTemplate.replace("<!--app-head-->", () => page.head).replace("<!--app-html-->", () => page.html);
  const file = join(dist, ...path.split("/").filter(Boolean), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ---- 4. the shell for unknown paths: no page content, the loader stays, the generic tags stay
const shell = withImage(template)
  .replace(/^[ \t]*<!--app-head-->[ \t]*\r?\n/m, "")
  .replace(/<title>.*<\/title>/, `<title>${esc(SITE_NAME)}</title>`)
  .replace(/(property="og:url" content=")[^"]*"/, `$1${esc(SITE_URL)}"`)
  .replace("<!--app-html-->", "");
writeFileSync(join(dist, "404.html"), shell);

// ---- 5. sitemap + robots (public/robots.txt is the text; its Sitemap line gets the address this build is for)
const built = typeof raw.meta?.built === "string" ? raw.meta.built.slice(0, 10) : null;
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((p) => `  <url><loc>${esc(SITE_URL + p)}</loc>${built ? `<lastmod>${built}</lastmod>` : ""}</url>`),
  "</urlset>",
  "",
].join("\n");
writeFileSync(join(dist, "sitemap.xml"), sitemap);
const robots = readFileSync(join(web, "public", "robots.txt"), "utf8").replace(/^Sitemap:.*$/m, `Sitemap: ${SITE_URL}sitemap.xml`);
writeFileSync(join(dist, "robots.txt"), robots);

console.log(`Pre-rendered ${routes.length} pages into ${relative(process.cwd(), dist) || "."}: ${pages.length} main pages, ${profiles.length} broker profiles, ${pairs.length} comparisons; plus 404.html, sitemap.xml and robots.txt for ${SITE_URL}`);
if (offCanon.length) console.warn(`${offCanon.length} page(s) report a canonical URL other than their own path (describeRoute in lib/routes.ts):\n  ${offCanon.join("\n  ")}`);
