import { useMemo, useState, type ReactNode } from "react";

export interface Col<T> {
  key: string; label: string; num?: boolean;
  get: (r: T) => string | number | null | undefined;
  fmt?: (v: never, r: T) => ReactNode;
}

/** Sortable table with CSV download: the table twin every chart gets. */
export function SortTable<T>({ rows, cols, initial, name, onRow, maxHeight }: {
  rows: T[]; cols: Col<T>[]; initial: { key: string; dir: "asc" | "desc" }; name: string;
  onRow?: (r: T) => void; maxHeight?: number;
}) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === sort.key) ?? cols[0];
    return [...rows].sort((a, b) => {
      const va = col.get(a), vb = col.get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const c = typeof va === "string" ? va.localeCompare(String(vb)) : (va as number) - (vb as number);
      return sort.dir === "asc" ? c : -c;
    });
  }, [rows, cols, sort]);

  const download = () => {
    const q = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.map((c) => q(c.label)).join(","), ...sorted.map((r) => cols.map((c) => q(c.get(r))).join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `${name}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-[12.5px] text-muted">
        <span>{rows.length} rows · click a column to sort</span>
        <button type="button" onClick={download} className="rounded-lg border border-line px-2.5 py-1 text-ink2 hover:text-ink">Download CSV</button>
      </div>
      <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight }}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface2 px-3 py-2 font-semibold text-ink2 ${c.num ? "text-right" : "text-left"}`}>
                  <button type="button" className="hover:text-ink" onClick={() =>
                    setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === "asc" ? "desc" : "asc") : c.num ? "desc" : "asc" }))}>
                    {c.label}{sort.key === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} onClick={onRow ? () => onRow(r) : undefined}
                className={`border-b border-grid last:border-0 hover:bg-surface2 ${onRow ? "cursor-pointer" : ""}`}>
                {cols.map((c) => {
                  const v = c.get(r);
                  return (
                    <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${c.num ? "tnum text-right" : ""}`}>
                      {c.fmt ? c.fmt(v as never, r) : v ?? "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableTwin({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-4">
      <summary className="cursor-pointer list-none text-[13px] text-ink2 hover:text-ink">
        <span className="inline-block transition group-open:rotate-90">›</span> Show as table
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
