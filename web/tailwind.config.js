/** Colours, type steps, radii and shadows come from CSS variables (src/index.css), so light/dark switch in one place. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        surface3: "var(--surface-3)",
        raise: "var(--raise)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        muted: "var(--muted)",
        mark: "var(--mark)",
        line: "var(--border)",
        rule: "var(--rule)",
        grid: "var(--grid)",
        track: "var(--track)",
        here: "var(--here)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "on-accent": "var(--on-accent)",
        pay: "var(--s1)",
        cost: "var(--s2)",
        better: "var(--better)",
        worse: "var(--worse)",
      },
      // Figtree, self-hosted (@fontsource-variable/figtree, imported once in main.tsx); display shares it
      fontFamily: {
        sans: ['"Figtree Variable"', "Figtree", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ['"Figtree Variable"', "Figtree", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      // the seven-step type scale (--fs-1 … --fs-7): text-fs-1 … text-fs-7
      fontSize: {
        "fs-1": "var(--fs-1)",
        "fs-2": "var(--fs-2)",
        "fs-3": "var(--fs-3)",
        "fs-4": "var(--fs-4)",
        "fs-5": "var(--fs-5)",
        "fs-6": "var(--fs-6)",
        "fs-7": "var(--fs-7)",
      },
      borderRadius: { card: "var(--r-card)" },
      boxShadow: { card: "var(--shadow)", lift: "var(--lift)", pop: "var(--pop)", press: "var(--press)" },
    },
  },
  plugins: [],
};
