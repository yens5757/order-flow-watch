import type { ReactNode } from "react";

/* ---------- icons (inline, stroke-based) ---------- */
const PATHS: Record<string, ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  minus: <path d="M6 12h12" />,
  download: <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  ext: <><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>,
  scale: <><path d="M12 3v18M5 21h14" /><path d="m5 7 14-2" /><path d="M5 7 2 14a3.5 3.5 0 0 0 6 0zM19 5l-3 7a3.5 3.5 0 0 0 6 0z" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  flask: <><path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" /><path d="M7 15h10" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  github: <path fill="currentColor" stroke="none" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />,
};
export function Icon({ name, size = 18, className = "" }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>{PATHS[name]}</svg>
  );
}

/* ---------- layout ---------- */
export function PageHeader({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-10">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</div>}
        <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[38px]">{title}</h1>
        {sub && <p className="mt-2 text-[15.5px] leading-relaxed text-ink2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ title, sub, right, info, children, className = "", foot }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; info?: ReactNode; children: ReactNode; className?: string; foot?: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="flex items-center gap-2 text-[15.5px] font-semibold text-ink">{title}{info && <Info>{info}</Info>}</h3>}
            {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
      {foot && <div className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">{foot}</div>}
    </section>
  );
}

/** Small "i" that reveals a definition on hover or keyboard focus. */
export function Info({ children }: { children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" className="rounded-full text-muted hover:text-ink focus:text-ink focus:outline-none" aria-label="More information">
        <Icon name="info" size={15} />
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-xl border border-line bg-surface2 p-3 text-left text-[12.5px] font-normal leading-relaxed text-ink2 opacity-0 shadow-card transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {children}
      </span>
    </span>
  );
}

/* ---------- controls ---------- */
export function Segmented<T extends string | number>({ value, onChange, options, size = "md" }: {
  value: T; onChange: (v: T) => void; options: [T, string][]; size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface2 p-1" role="tablist">
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`whitespace-nowrap rounded-lg font-medium transition-colors ${size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13.5px]"} ${value === v ? "bg-surface3 text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** `full`: fills its container with the visible label hidden (for panels that already title the control). */
export function Select<T extends string | number>({ label, value, onChange, options, full }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][]; full?: boolean;
}) {
  return (
    <label className={`items-center gap-2 text-[12.5px] text-muted ${full ? "flex w-full" : "inline-flex"}`}>
      <span className={full ? "sr-only" : "hidden sm:inline"}>{label}</span>
      <select value={String(value)} aria-label={label}
        onChange={(e) => onChange((typeof value === "number" ? Number(e.target.value) : e.target.value) as T)}
        className={`rounded-xl border border-line bg-surface2 px-3 py-2 text-[13.5px] font-medium text-ink outline-none focus:border-accent ${full ? "w-full min-w-0 text-ellipsis" : ""}`}>
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </select>
    </label>
  );
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface3"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

/* ---------- figures ---------- */
export function Kpi({ icon, label, value, sub, tone }: { icon?: string; label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
        {icon && <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-accent"><Icon name={icon} size={15} /></span>}
        {label}
      </div>
      <div className={`mt-3 font-display text-[30px] font-extrabold leading-none tracking-tight ${tone === "good" ? "text-better" : tone === "bad" ? "text-worse" : "text-ink"}`}>{value}</div>
      {sub && <div className="mt-2 text-[12.5px] leading-snug text-muted">{sub}</div>}
    </div>
  );
}

/** Status chip: colour plus icon plus label, so meaning never rides on colour alone. */
export function Status({ kind, children }: { kind: "good" | "bad" | "neutral"; children: ReactNode }) {
  const c = kind === "good" ? "var(--good)" : kind === "bad" ? "var(--critical)" : "var(--muted)";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold"
      style={{ color: c, borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 10%, transparent)` }}>
      <Icon name={kind === "good" ? "check" : kind === "bad" ? "x" : "minus"} size={13} />{children}
    </span>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
            : <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="grid h-48 place-items-center rounded-xl border border-dashed border-line text-center text-[13.5px] text-muted">{children}</div>
);
