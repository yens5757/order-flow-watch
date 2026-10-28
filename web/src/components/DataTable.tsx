// Sortable table with optional search, CSV download and clickable rows. Every chart has one of these as its table view.
import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "./ui";

export interface Col<R> {
  key: string;
  label: string;
  value: (r: R) => number | string | null;
  render?: (r: R) => ReactNode;
  num?: boolean;
  hint?: string;
}

export function DataTable<R>({ rows, cols, initial, onRow, search, file, maxHeight, highlight }: {
  rows: R[]; cols: Col<R>[]; initial?: { key: string; dir: 1 | -1 }; onRow?: (r: R) => void;
  search?: (r: R) => string; file?: string; maxHeight?: number; highlight?: string[];
}) {
  const hl = (k: string) => (highlight?.includes(k) ? "bg-[var(--accent-soft)]" : "");
  const [sort, setSort] = useState(initial ?? { key: cols[0].key, dir: 1 as 1 | -1 });
  const [q, setQ] = useState("");
  const col = cols.find((c) => c.key === sort.key) ?? cols[0];
  const shown = useMemo(() => {
    const f = q && search ? rows.filter((r) => search(r).toLowerCase().includes(q.toLowerCase())) : rows;
    return [...f].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, q, search, col, sort.dir]);

  const csv = () => {
    const cell = (v: unknown) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const text = [cols.map((c) => cell(c.label)).join(","), ...shown.map((r) => cols.map((c) => cell(c.value(r))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = file ?? "table.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {(search || file) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {search ? (
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface2 px-3 py-2 text-muted focus-within:border-accent sm:max-w-xs">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search the table"
                className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted" />
            </label>
          ) : <span />}
          {file && (
            <button type="button" onClick={csv} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[13px] font-medium text-ink2 hover:border-accent hover:text-ink">
              <Icon name="download" size={15} />CSV
            </button>
          )}
        </div>
      )}
      <div className="overflow-auto rounded-xl border border-line" style={{ maxHeight }}>
        <table className="w-full border-collapse text-[13.5px]">
          <thead className="sticky top-0 z-10 bg-surface2">
            <tr>
              {cols.map((c) => (
                <th key={c.key} scope="col" title={c.hint} className={`whitespace-nowrap border-b border-line px-3 py-2.5 font-semibold ${highlight?.includes(c.key) ? "text-accent" : "text-ink2"} ${c.num ? "text-right" : "text-left"}`}>
                  <button type="button" className="inline-flex items-center gap-1 hover:text-ink"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : c.num ? -1 : 1 }))}>
                    {c.label}
                    <span className={`text-[10px] ${sort.key === c.key ? "text-accent" : "text-transparent"}`}>{sort.dir === 1 ? "▲" : "▼"}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} onClick={onRow ? () => onRow(r) : undefined}
                className={`border-b border-line last:border-0 ${onRow ? "cursor-pointer hover:bg-surface2" : ""}`}>
                {cols.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 ${hl(c.key)} ${c.num ? "tnum text-right text-ink" : "text-ink2"}`}>
                    {c.render ? c.render(r) : (c.value(r) ?? "–")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
