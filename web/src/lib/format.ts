/** A percentage with a proper minus sign: 30.8%, −2.8% (never "−0.0%"). */
export const pct = (v: number | null | undefined, d = 0) =>
  (v == null || Number.isNaN(v) ? "–" : `${v < 0 && Number(Math.abs(v).toFixed(d)) !== 0 ? "−" : ""}${Math.abs(v).toFixed(d)}%`);
export const signed = (v: number | null | undefined, d = 1, unit = "") =>
  v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}${unit}`;
/** Cents with one decimal and a proper minus sign: 223.2¢, −12.5¢ (never "−0.0¢"). */
export const cents = (v: number | null | undefined) => (v == null ? "–" : `${v <= -0.05 ? "−" : ""}${Math.abs(v).toFixed(1)}¢`);
export const num = (v: number | null | undefined, d = 0) =>
  v == null ? "–" : v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export const dollars = (v: number | null | undefined) => {
  if (v == null) return "–";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`;
  return `${s}$${a < 10 ? a.toFixed(2) : a.toFixed(0)}`;
};
export const monthLong = (m: string) =>
  new Date(+m.slice(0, 4), +m.slice(4) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
export const monthShort = (m: string) =>
  new Date(+m.slice(0, 4), +m.slice(4) - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
export const quarterLong = (q: string) => `${["", "Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"][+q.slice(-1)]} ${q.slice(0, 4)}`;
export const quarterShort = (q: string) => q.replace(/^20(\d\d)Q(\d)/, "Q$2 '$1");
export const strength = (r: number) => {
  const a = Math.abs(r);
  return a < 0.2 ? "very weak" : a < 0.4 ? "weak" : a < 0.6 ? "moderate" : a < 0.8 ? "strong" : "very strong";
};
/** Dollars and cents with a proper minus sign: −$0.10, $2.04. */
export const usd2 = (v: number | null | undefined) => (v == null ? "–" : `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`);
/** Dollars and cents with the sign always written, for a figure measured against a reference: +$0.82, −$0.09 (a figure
 *  that rounds to zero still reads "+$0.00" here: the explorer's tidy() drops that sign). */
export const usdSigned = (v: number | null | undefined) => (v == null ? "–" : `${v < 0 ? "−" : "+"}$${Math.abs(v).toFixed(2)}`);
/** FINRA lists many firm names in capitals; show them in title case, keeping short suffixes like LLC. */
export const titleCase = (s: string) =>
  s === s.toUpperCase()
    ? s.toLowerCase().replace(/\b([a-z])([a-z]*)/g, (w, a: string, b: string) => (/^(llc|lp|lllp|ats|usa|nyse|ubs|bny|rbc|bmo)$/.test(w) ? w.toUpperCase() : a.toUpperCase() + b))
    : s;
/** Execution time: "158 ms" under a second, "1.4 s" from there. The 605 time fields are milliseconds (meta.timeUnit). */
export const ms = (v: number | null | undefined) => (v == null ? "–" : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(1)} s`);
/** A checked-on date: "2026-11-01" -> "Nov 1, 2026" ("November 1, 2026" with month "long"), parsed as a local date so it never slips a day west of UTC. */
export const dayLong = (iso: string, month: "short" | "long" = "short") => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month, year: "numeric" });
};
/** Axis tick for dollar values: −$0.50, $1.00. */
export const usdTick = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
/** Yearly dollars: cents under $10 ($3.40), whole dollars with commas from there (−$1,250). */
export const perYear = (v: number) => (Math.abs(v) < 10 ? usd2(v) : `${v < 0 ? "−" : ""}$${num(Math.abs(v), 0)}`);
/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd. */
export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** The separator between the parts of a scope line ("S&P 500 stocks · market orders · September 2026"), held to the part
 *  before it by a no-break space, so a wrapped line never starts with "·". */
export const DOT = "\u00a0· ";
