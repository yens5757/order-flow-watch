// "All firms": every firm that reports, in the broker page's ranked-table look (components/broker/WhereSits.tsx). A real
// table: the names of firms with a page here are links (ink, underlined in the action teal) and a press anywhere on such
// a row opens it, but rows are never Tab stops; the share of the spread is in bold; a firm with no report for these
// orders says so in words. A group filter (the pill switch; a select on phones), a search, a CSV download, and sorting by
// any column. The first 25 rows show, then "See all": every row is in the page, and the cut is a CSS rule that applies
// only with a script (firms.css); a search shows every match. On phones each firm restacks into a short list item, the
// table roles kept. When the order changes (a filter, a sort, the group), the rows glide to their new places.
import { useEffect, useMemo, useRef, useState } from "react";
import { DOT, num, pct } from "../../lib/format";
import { useBrowserLayoutEffect } from "../../lib/hooks";
import { brokerPath, href } from "../../lib/routes";
import { Card, Icon, Segmented, Select } from "../ui";
import { GROUPS, share, type FirmRow } from "./firms";

type Key = "name" | "cat" | "cust" | "pi" | "sz";
/** `first`: the direction a column sorts in when it is picked (names A to Z, the cheapest first, the most improved first) */
const COLS: { key: Key; label: string; num?: boolean; first: 1 | -1 }[] = [
  { key: "name", label: "Firm", first: 1 },
  { key: "cat", label: "Category", first: 1 },
  { key: "cust", label: "Customer pays", num: true, first: 1 },
  { key: "pi", label: "Price-improved", num: true, first: -1 },
  { key: "sz", label: "Average order", num: true, first: -1 },
];
/** rows shown before "See all"; a list only a few longer than this shows whole */
const FIRST = 25;

const valueOf = (r: FirmRow, k: Key) => (k === "name" ? r.name : k === "cat" ? r.cat : r[k]);
/** By one column, firms without a figure last whichever way it runs, then by name. */
const byCol = (k: Key, dir: 1 | -1) => (a: FirmRow, b: FirmRow) => {
  const x = valueOf(a, k), y = valueOf(b, k);
  if (x == null || y == null) return x == null && y == null ? a.name.localeCompare(b.name) : x == null ? 1 : -1;
  const c = typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number);
  return c * dir || a.name.localeCompare(b.name);
};

const none = <><span aria-hidden="true">–</span><span className="sr-only">not reported</span></>;

export function FirmTable({ rows, scope, month, file }: { rows: FirmRow[]; scope: string; month: string; file: string }) {
  const [group, setGroup] = useState(-1);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "cust", dir: 1 });
  const [all, setAll] = useState(false);

  const inGroup = useMemo(() => (group < 0 ? rows : rows.filter((r) => r.g === group)), [rows, group]);
  const needle = q.trim().toLowerCase();
  const sorted = useMemo(() => {
    const found = needle ? inGroup.filter((r) => `${r.name} ${r.id} ${r.cat} ${GROUPS[r.g].row}`.toLowerCase().includes(needle)) : inGroup;
    return [...found].sort(byCol(sort.key, sort.dir));
  }, [inGroup, needle, sort]);
  // the first rows only: not while searching, and not for a list just a few rows longer
  const cut = !needle && !all && sorted.length > FIRST + 5;

  const noun = group < 0 ? "firms" : GROUPS[group].noun;
  const status = needle
    ? `${sorted.length} of ${inGroup.length} ${noun} ${sorted.length === 1 ? "matches" : "match"} “${q.trim()}”`
    : `${inGroup.length} ${noun}${cut ? `, the first ${FIRST} shown` : ""}`;

  // the re-sort: rows in both orders glide from their old place to the new one, rows new to the view fade in (a FLIP by
  // firm). Not while typing a search (every key would move the list), and nothing moves under reduced motion.
  const body = useRef<HTMLTableSectionElement>(null);
  const tops = useRef<Map<string, number> | null>(null);
  const lastQ = useRef(q);
  const measure = () => {
    const now = new Map<string, number>();
    body.current?.querySelectorAll<HTMLElement>("tr[data-id]").forEach((tr) => { if (tr.offsetParent) now.set(tr.dataset.id!, tr.offsetTop); });
    return now;
  };
  const orderKey = `${sorted.map((r) => r.id).join()}|${cut}`;
  useBrowserLayoutEffect(() => {
    const was = tops.current, now = measure(), typed = lastQ.current !== q;
    tops.current = now;
    lastQ.current = q;
    if (!was || typed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    body.current?.querySelectorAll<HTMLElement>("tr[data-id]").forEach((tr) => {
      const y = now.get(tr.dataset.id!), from = was.get(tr.dataset.id!);
      if (y == null) return;
      if (from == null) tr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
      else if (Math.abs(from - y) > 0.5) {
        tr.animate([{ transform: `translateY(${from - y}px)` }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" });
      }
    });
  }, [orderKey]);
  // a resize moves rows without a new order: keep the places current, so the next glide starts where the rows are
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { tops.current = measure(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [sorted.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const more = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    setAll(!all);
    // "Show fewer" shortens the list under a reader who scrolled down it: bring the button back into view
    if (all) requestAnimationFrame(() => more.current?.scrollIntoView({ block: "nearest" }));
  };

  const csv = () => {
    const cell = (x: unknown) => (x == null ? "" : /[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
    const head = ["Firm", "Category", "Group", "Customer pays (% of the spread)", "Price-improved (%)", "Average order ($)"];
    const lines = sorted.map((r) => [r.name, r.cat, GROUPS[r.g].row, r.cust?.toFixed(2), r.pi?.toFixed(1), r.sz?.toFixed(0)]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head, ...lines].map((l) => l.map(cell).join(",")).join("\n")], { type: "text/csv" }));
    a.download = file;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pick = (k: Key) => setSort((s) => ({ key: k, dir: s.key === k ? (-s.dir as 1 | -1) : COLS.find((c) => c.key === k)!.first }));
  const options: [number, string][] = GROUPS.map((g, i) => [i, g.pill]);

  return (
    <Card className="af-list" title="All firms" sub={`${scope}${DOT}${month}`} right={
      <>
        <span className="af-gseg js-only"><Segmented<number> size="sm" label="Firm group" value={group} onChange={setGroup} options={[[-1, "All"], ...options]} /></span>
        <span className="af-gsel js-only"><Select<number> label="Show" value={group} onChange={setGroup} options={[[-1, "All firms"], ...options]} /></span>
      </>
    }>
      <div className="af-tools js-only">
        <label className="field af-search">
          <Icon name="search" size={20} />
          <span className="sr-only">Search firms</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search firms" />
        </label>
        <button type="button" className="btn btn-ghost" onClick={csv}><Icon name="download" size={20} />Download CSV</button>
      </div>
      <p className="af-count js-only" role="status">{status}</p>

      {sorted.length === 0 ? (
        <p className="af-none">No firm matches “{q.trim()}”. Try part of the name.</p>
      ) : (
        <div className={`af-tbl${cut ? "" : " all"}`} id="af-tbl">
          <table role="table">
            <caption className="sr-only">All firms: {scope}, {month}</caption>
            <thead role="rowgroup">
              <tr role="row">
                {COLS.map((c) => (
                  <th key={c.key} role="columnheader" scope="col" className={`c-${c.key}${c.num ? " num" : ""}`}
                    aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                    <button type="button" className="af-sort" onClick={() => pick(c.key)}>
                      {c.label}<Icon name={sort.key === c.key && sort.dir === 1 ? "up" : "down"} size={16} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup" ref={body}>
              {sorted.map((r, i) => (
                <tr key={r.id} role="row" data-id={r.id} className={[r.slug ? "is-link" : "", cut && i >= FIRST ? "more" : ""].filter(Boolean).join(" ") || undefined}>
                  <th role="rowheader" scope="row" className="c-name">
                    {r.slug ? <a href={href(brokerPath(r.slug))}>{r.name}</a> : r.name}
                  </th>
                  <td role="cell" className="c-cat">{r.cat}</td>
                  <td role="cell" className="c-cust num">{r.cust == null ? <span className="word">Not reported</span> : share(r.cust)}</td>
                  <td role="cell" className={`c-pi num${r.pi == null ? " is-nil" : ""}`}>
                    {r.pi == null ? none : <><span className="k">Price-improved </span>{pct(r.pi, 0)}</>}
                  </td>
                  <td role="cell" className={`c-sz num${r.sz == null ? " is-nil" : ""}`}>
                    {r.sz == null ? none : <><span className="k">Average order </span>${num(r.sz)}</>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!needle && sorted.length > FIRST + 5 && (
        <button ref={more} type="button" className="btn btn-ghost af-more js-only" aria-expanded={all} aria-controls="af-tbl" onClick={toggle}>
          {all ? "Show fewer" : `See all ${sorted.length}`}<Icon name="down" size={20} />
        </button>
      )}
      {sorted.some((r) => r.cust == null) && (
        <p className="af-fn">Not reported: the firm's {month} report has no orders of this kind.</p>
      )}
    </Card>
  );
}
