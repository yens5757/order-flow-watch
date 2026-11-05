// The pair picker: two selects that only report a pick (nothing happens on change, WCAG 3.2.2) and a real "Compare" link
// whose address follows the two picks, so opening another pair is an explicit press. Picking in one box the broker the
// other box shows swaps the two, so the boxes always name two different brokers; a status line says so for screen
// readers. Only works with a script: without one it is hidden, and the list of every comparison below still links each pair.
import { useState } from "react";
import type { Data, Firm } from "../../lib/data";
import { comparePath, href } from "../../lib/routes";
import { Icon, Select } from "../ui";

export function Picker({ d, A, B }: { d: Data; A: Firm; B: Firm }) {
  const [x, setX] = useState(A.id);
  const [y, setY] = useState(B.id);
  const [said, setSaid] = useState("");
  // the 25 retail brokers by name; a firm in the address that isn't one (the clearing firm) stays pickable
  const firms = [...d.brokers, ...[A, B].filter((F) => F.type !== "broker" && !d.brokers.includes(F))];
  const opts: [string, string][] = [...new Set(firms)].sort((p, q) => p.short.localeCompare(q.short)).map((F) => [F.id, F.short]);
  const pick = (box: 0 | 1, v: string) => {
    const [mine, other, setMine, setOther] = box === 0 ? [x, y, setX, setY] : [y, x, setY, setX];
    if (v === other) {
      setOther(mine);
      setSaid(`${d.byId[mine]?.short ?? mine} moved to the ${box === 0 ? "second" : "first"} box.`);
    } else setSaid("");
    setMine(v);
  };
  const X = d.byId[x] ?? A, Y = d.byId[y] ?? B;
  return (
    <div className="cmp-pick js-only" role="group" aria-label="Pick two brokers">
      <Select label="First broker" value={x} onChange={(v) => pick(0, v)} options={opts} hideLabel />
      <span className="cmp-vs" aria-hidden="true">vs</span>
      <Select label="Second broker" value={y} onChange={(v) => pick(1, v)} options={opts} hideLabel />
      <a className="btn btn-ghost cmp-go" href={href(comparePath(X.slug, Y.slug))}>
        Compare<span className="sr-only"> {X.short} and {Y.short}</span><Icon name="arrow" size={20} />
      </a>
      <p className="sr-only" role="status">{said}</p>
    </div>
  );
}
