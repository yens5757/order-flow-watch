/** Colours come from CSS variables (src/index.css), so light/dark switch in one place. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        muted: "var(--muted)",
        line: "var(--border)",
        grid: "var(--grid)",
        pay: "var(--s1)",
        cost: "var(--s2)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      maxWidth: { prose2: "46rem" },
    },
  },
  plugins: [],
};
