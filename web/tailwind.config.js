/** Colours come from CSS variables (src/index.css), so light/dark switch in one place. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        surface3: "var(--surface-3)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        muted: "var(--muted)",
        line: "var(--border)",
        grid: "var(--grid)",
        accent: "var(--accent)",
        pay: "var(--s1)",
        cost: "var(--s2)",
        better: "var(--better)",
        worse: "var(--worse)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: { card: "var(--shadow)" },
    },
  },
  plugins: [],
};
