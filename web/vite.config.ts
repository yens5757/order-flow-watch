import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Pages live at nested paths (compare/fidelity-vs-robinhood/), so asset URLs must be absolute: the base is the path
// the site is served under. SITE_BASE and VITE_SITE_URL are set in .github/workflows/weekly.yml, the one place to
// change when the site moves to a custom domain ("/" and "https://<domain>/").
function normalise(base: string): string {
  const inner = base.replace(/^\/+|\/+$/g, "");
  return inner ? `/${inner}/` : "/";
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  base: normalise(process.env.SITE_BASE ?? "/"),
  build: {
    chunkSizeWarningLimit: 700,
    // ECharts is most of the bundle and changes rarely: ship it as its own cacheable file, which charts/EChart.tsx loads
    // only when a page draws a chart (a dynamic import), so pages without one never fetch it. Client build only: the
    // server build scripts/prerender.mjs makes (dist-ssr/) keeps dependencies external, so there is nothing to split.
    rollupOptions: isSsrBuild
      ? {}
      : { output: { manualChunks: { echarts: ["echarts/core", "echarts/charts", "echarts/components", "echarts/renderers", "echarts/features"] } } },
  },
}));
