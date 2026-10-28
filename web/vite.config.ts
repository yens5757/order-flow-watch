import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps every asset path relative, so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  plugins: [react()],
  base: "./",
  // ECharts is most of the bundle and changes rarely: ship it as its own cacheable file
  build: { rollupOptions: { output: { manualChunks: { echarts: ["echarts/core", "echarts/charts", "echarts/components", "echarts/renderers", "echarts/features"] } } }, chunkSizeWarningLimit: 700 },
});
