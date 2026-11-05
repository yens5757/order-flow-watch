/// <reference types="vite/client" />
// The one place the site's name, tagline, public URL and repository are declared. Every page imports these;
// nothing else spells the brand out. The repository keeps its original name (order-flow-watch) for now.

export const SITE_NAME = "Fills and Fees";
export const TAGLINE = "Broker comparison with nothing to sell";
export const REPO = "https://github.com/yens5757/order-flow-watch";

const DEFAULT_SITE_URL = "https://fillsandfees.com/";

/** Public URL of the deployed site, always ending with "/": VITE_SITE_URL at build time (set in
 *  .github/workflows/weekly.yml, the place to change for a custom domain) or the GitHub Pages default. */
export const SITE_URL = withSlash(envUrl() ?? DEFAULT_SITE_URL);

function envUrl(): string | null {
  const v: unknown = import.meta.env.VITE_SITE_URL;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function withSlash(u: string): string {
  return u.endsWith("/") ? u : `${u}/`;
}
