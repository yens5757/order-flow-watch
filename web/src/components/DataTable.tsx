// A sortable table with optional search and CSV download, in the broker page's ranked-table look. It scrolls sideways
// inside its own box, the name column pinned. Rows that open something do it through a real control in the name cell: a
// link (rowHref) for a page, a button (onRow) for an action on this page; a press anywhere else on the row does the same,
// but the row itself is never a Tab stop. Every chart that ranks brokers has one of these, or a ChartTable, beside it.
import { Fragment, useMemo, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { Icon, useSideScroll } from "./ui";

/** A heading split before its unit (" / $10k", " (% spread)"), each part kept to one line: a phone may set the unit on a
 *  second line ("Vs fair price" over "/ $10k"), so a column is no wider than its widest part (ui.css). */
const headParts = (label: string): ReactNode =>
  label.split(/ (?=[/(])/).map((p, i) => <Fragment key={i}>{i > 0 && " "}<span>{p}</span></Fragment>);

export interface Col<R> {
  key: string;
  /** sentence case, as a reader would say it ("Customer pays", not "CUSTOMER PAYS") */
  label: string;
  value: (r: R) => number | string | null;
  render?: (r: R) => ReactNode;
  num?: boolean;
  /** the column's definition, shown as the header's tooltip (the browser's own) */
  hint?: string;
  /** stays in view while the table scrolls sideways (the name column; one per table) */
  pin?: boolean;
  /** lets long cells wrap instead of widening the table */
  wrap?: boolean;
  /** the column that names the row and carries its link or button (default: the pinned column, else the first) */
  link?: boolean;
}

export function DataTable<R>({ rows, cols, initial, rowHref, onRow, rowLabel, rowKey, here, search, searchLabel = "Search the table",
  file, maxHeight, highlight, caption }: {
  rows: R[]; cols: Col<R>[]; initial?: { key: string; dir: 1 | -1 };
  /** each row's page: its name becomes a real link, and the row opens it (null or undefined: this row has none) */
  rowHref?: (r: R) => string | null | undefined;
  /** an action on this page for each row ("pick this broker"): its name becomes a button. Anything that opens another
   *  page takes rowHref instead. */
  onRow?: (r: R) => void;
  /** the link's or button's name for screen readers when the cell's own text isn't enough ("Pick Robinhood") */
  rowLabel?: (r: R) => string;
  /** a stable key per row (default: its place in the list) */
  rowKey?: (r: R) => string;
  /** the row the page is about: Here-tinted, in bold */
  here?: (r: R) => boolean;
  search?: (r: R) => string; searchLabel?: string; file?: string; maxHeight?: number; highlight?: string[];
  /** names the table for screen readers */
  caption?: string;
}) {
  const [sort, setSort] = useState(initial ?? { key: cols[0].key, dir: 1 as 1 | -1 });
  const [q, setQ] = useState("");
  const col = cols.find((c) => c.key === sort.key) ?? cols[0];
  const shown = useMemo(() => {
    const f = q && search ? rows.filter((r) => search(r).toLowerCase().includes(q.toLowerCase())) : rows;
    return [...f].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      // rows without a value keep their given order, last, whichever way the column is sorted
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, q, search, col, sort.dir]);
  const named = cols.find((c) => c.link) ?? cols.find((c) => c.pin) ?? cols[0];
  const hl = (k: string) => (highlight?.includes(k) ? " hl" : "");

  const box = useRef<HTMLDivElement>(null);
  const { scrolled } = useSideScroll(box); // it watches the table's own width too, so a sort or a search is seen

  // keyboard focus on a heading or a name the box only partly shows (under the pinned column, past its right edge, or
  // under a fade the page draws there, given as the box's scroll-padding-right): scroll sideways until all of it shows.
  // The browser leaves a stop that is partly in view where it is, which can leave its ring a sliver at the edge.
  const reveal = (e: FocusEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement, b = box.current;
    if (!b || el === b || el.closest(".pin")) return; // the pinned column is always in view
    const s = b.scrollLeft, bx = b.getBoundingClientRect().left + b.clientLeft;
    const r = el.getBoundingClientRect(), ex = r.left - bx + s; // the stop's place along the table
    const view = b.clientWidth - (parseFloat(getComputedStyle(b).scrollPaddingRight) || 0);
    const pin = b.querySelector<HTMLElement>("thead .pin");
    // where the pinned column sits when nothing is scrolled (the widths of the columns before it: a sticky cell's own
    // offset moves with it), and its width (it covers what scrolls under it)
    const before = pin ? [...pin.parentElement!.children].slice(0, [...pin.parentElement!.children].indexOf(pin)) : [];
    const pinAt = before.reduce((a, c) => a + (c as HTMLElement).offsetWidth, 0), pw = pin ? pin.offsetWidth : 0;
    const latest = pin && ex >= pinAt + pw ? Math.max(ex - pw, pinAt) : ex; // further and the stop is under the pin (or off the left edge)
    const earliest = ex + r.width - view; // less and the stop runs past the right edge
    const next = Math.round(Math.max(Math.min(s, latest), Math.min(earliest, latest)));
    if (Math.abs(next - s) > 1) b.scrollLeft = next;
  };

  const csv = () => {
    const cell = (v: unknown) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const text = [cols.map((c) => cell(c.label)).join(","), ...shown.map((r) => cols.map((c) => cell(c.value(r))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = file ?? "table.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  // a press on the row (not on a control in it, and not while selecting text) presses its name's link or button
  const rowPress = (e: MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as Element).closest("a, button, input, select, textarea, summary, label")) return;
    if (window.getSelection()?.toString()) return;
    e.currentTarget.querySelector<HTMLElement>(".dt-go")?.click();
  };
  const sortBy = (c: Col<R>) => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : c.num ? -1 : 1 }));

  return (
    <div className="dt">
      {(search || file) && (
        <div className="dt-bar">
          {search ? (
            <label className="field dt-search">
              <Icon name="search" size={20} />
              <span className="sr-only">{searchLabel}</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
            </label>
          ) : <span />}
          {file && (
            <button type="button" onClick={csv} className="btn btn-ghost">
              <Icon name="download" size={20} />Download CSV
            </button>
          )}
        </div>
      )}
      {search && <p className="dt-count" role="status">{q ? `${shown.length} of ${rows.length} shown` : ""}</p>}
      <div ref={box} className={`tbox dt-box${scrolled ? " is-scrolled" : ""}`} style={maxHeight ? { maxHeight } : undefined} onFocus={reveal}>
        <table className="tbl">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  className={[c.num ? "num" : "", c.pin ? "pin" : "", hl(c.key).trim()].filter(Boolean).join(" ") || undefined}>
                  <button type="button" className="dt-sort" title={c.hint} onClick={() => sortBy(c)}>
                    <span className="dt-h">{headParts(c.label)}</span><Icon name={sort.key === c.key && sort.dir === 1 ? "up" : "down"} size={16} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const to = rowHref?.(r) ?? null;
              const act = !to && onRow ? onRow : null;
              const mine = here?.(r) ?? false;
              return (
                <tr key={rowKey ? rowKey(r) : i} onClick={to || act ? rowPress : undefined}
                  className={[to || act ? "go-row" : "", mine ? "here" : ""].filter(Boolean).join(" ") || undefined}>
                  {cols.map((c) => {
                    const content = c.render ? c.render(r) : (c.value(r) ?? "–");
                    const cls = [c.num ? "num" : "", c.pin ? "pin" : "", c.wrap ? "wrap-cell" : "", hl(c.key).trim()].filter(Boolean).join(" ") || undefined;
                    if (c !== named) return <td key={c.key} className={cls}>{content}</td>;
                    const label = rowLabel?.(r);
                    return (
                      <th key={c.key} scope="row" className={cls}>
                        {to ? <a className="dt-go" href={to} aria-label={label}>{content}</a>
                          : act ? <button type="button" className="dt-go" aria-label={label} onClick={() => act(r)}>{content}</button>
                            : content}
                      </th>
                    );
                  })}
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={cols.length} className="dt-none">{q ? `Nothing matches “${q}”.` : "Nothing to show."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
