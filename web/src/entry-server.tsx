// Server entry for scripts/prerender.mjs: renders one page of the site to static HTML (react-dom/server), so every
// page is on disk with its content for crawlers and link previews before the app (main.tsx) takes over in the browser.
import { renderToString } from "react-dom/server";
import { AppShell } from "./App";
import { buildData, type Data, type Raw } from "./lib/data";
import { describeRoute } from "./lib/routes";
import { SITE_NAME } from "./lib/site";
import { ThemeProvider } from "./lib/theme";

export { SITE_NAME };

/** site.json parsed from disk -> the Data every page takes: the same lookups lib/data.ts builds after fetching it in the
 *  browser, firms[].slug filled in by the same rule as build_site.py when the file predates it. */
export const toData = (raw: Raw): Data => buildData(raw);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One page as static HTML: `html` goes inside <div id="root">, `head` in place of <!--app-head--> (index.html).
 *  `path` is relative to the Vite base ("" home, "compare/", "brokers/robinhood/"...), `search` the query string. */
export function render(path: string, search: string, data: Data): { html: string; head: string; canonical: string } {
  const html = renderToString(
    <ThemeProvider>
      <AppShell data={data} path={path} search={search} />
    </ThemeProvider>,
  );
  const { title, description, canonical } = describeRoute(data, path, search);
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
  ].join("\n    ");
  return { html, head, canonical };
}
