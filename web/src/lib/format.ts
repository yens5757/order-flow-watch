export const pct = (v: number | null | undefined, d = 0) => (v == null || Number.isNaN(v) ? "–" : `${v.toFixed(d)}%`);
export const signed = (v: number | null | undefined, d = 1, unit = "") =>
  v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}${unit}`;
export const cents = (v: number | null | undefined) => (v == null ? "–" : `${v.toFixed(1)}¢`);
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
