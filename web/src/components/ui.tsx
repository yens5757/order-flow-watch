import type { ReactNode } from "react";

export function Card({ title, sub, right, children, className = "" }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || right) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-ink">{title}</h3>}
            {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
          </div>
          {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-xl bg-surface2 p-1" role="group">
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-lg font-medium transition ${size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13px]"} ${
            value === v ? "bg-surface text-ink shadow-sm" : "text-ink2 hover:text-ink"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] text-muted">{label}</span>
      <select value={String(value)} onChange={(e) => {
          const hit = options.find(([v]) => String(v) === e.target.value);
          if (hit) onChange(hit[0]);
        }}
        className="min-h-[36px] rounded-lg border border-line bg-surface px-3 pr-8 text-[13.5px] text-ink outline-none focus:ring-2 focus:ring-[var(--pay-wash)]">
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </select>
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="text-[12px] text-muted">{label}</span>{children}</div>;
}

export function Tile({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[12.5px] text-ink2">{label}</div>
      <div className="mt-1 text-[26px] font-semibold leading-tight text-ink">{value}</div>
      {note && <div className="mt-1 text-[12px] leading-snug text-muted">{note}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; kind?: "box" | "line" | "dot" | "tick" }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink2">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.kind === "line" ? <i className="inline-block h-[2px] w-4 rounded" style={{ background: it.color }} />
            : it.kind === "dot" ? <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
            : it.kind === "tick" ? <i className="inline-block h-3 w-[3px] rounded" style={{ background: it.color }} />
            : <i className="inline-block h-3 w-3 rounded-[3px]" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "good" | "bad" | "neutral"; children: ReactNode }) {
  const cls = tone === "good" ? "bg-[var(--pay-wash)] text-pay" : tone === "bad" ? "bg-[var(--cost-wash)] text-cost" : "bg-surface2 text-ink2";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${cls}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-[13.5px] text-muted">{children}</div>;
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</div>;
}
