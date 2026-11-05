// calculator/: what a year of the visitor's own trading costs at their broker, and at every other one. Composition (the
// broker page's board): the answer left, "How you trade" right on a desktop; one reading-width stack, answer first, below
// 1024px; then the ranking as bars, every broker in a table and how it adds up. Brief: .impeccable/surfaces/
// web-src-pages-calculator-tsx.md. The inputs live in the query string (calculator/?n=24&s=2000&mix=50&o=0&c=5000&m=0&
// b=robinhood) so a view can be shared, and in localStorage so they stick. Only the visitor's own edits are saved (as they
// type or pick): opening a link, such as a broker page's "Change", shows its inputs without replacing the saved ones.
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerCard } from "../components/calculator/AnswerCard";
import "../components/calculator/calculator.css";
import { InputsCard } from "../components/calculator/InputsCard";
import { headline, rankAll, rankWords, poolClause, sanitize } from "../components/calculator/model";
import { Breakdown, HowCard, Ranking } from "../components/calculator/Results";
import { loadBroker, loadInputs, saveBroker, saveInputs } from "../components/calculator/store";
import { PageHeader } from "../components/ui";
import { annualCost, CALC_KEYS as KEYS, calcQuery, DEFAULT_INPUTS, type CostInputs } from "../lib/cost";
import { idFromUrl, slugOf, type Data } from "../lib/data";
import { onNavigate, readLocation, readQuery, useBrowserLayoutEffect, writeQuery } from "../lib/hooks";
import { href, pagePath, parseRoute } from "../lib/routes";

/** True when the query carries any calculator input. */
const hasInputs = (p: URLSearchParams) => KEYS.some(([, key]) => p.has(key));

/** The inputs a link describes. A link only lists what differs from the defaults (see `query`), so a key it leaves out
 *  means the default, never the recipient's own last inputs; those (`fallback`) are used only for a bare calculator/.
 *  Values are held to what the boxes accept (model.ts sanitize), so the boxes show exactly what the figures use. */
function fromUrl(search: string, fallback: CostInputs): CostInputs {
  const p = readQuery(search);
  const out = hasInputs(p) ? { ...DEFAULT_INPUTS } : { ...fallback };
  for (const [field, key] of KEYS) {
    const v = Number(p.get(key));
    if (p.has(key) && Number.isFinite(v) && v >= 0) out[field] = v;
  }
  return sanitize(out);
}

/** The broker named in the URL (calculator/?b=fidelity, as broker pages link it; older links name a reporter id) when it is one we track. */
function brokerFromUrl(d: Data, search: string): string | null {
  const id = idFromUrl(d, readQuery(search).get("b"));
  return id && d.byId[id].type === "broker" ? id : null;
}
/** The broker saved in this browser, when it is still one we track. */
const savedBroker = (d: Data) => { const id = loadBroker(); return d.byId[id]?.type === "broker" ? id : "HOOD"; };

/** The query for a set of inputs and a broker: only the inputs that differ from the defaults (lib/cost.ts, which the
 *  broker pages' "Change" link uses too). */
const query = (d: Data, inp: CostInputs, broker: string) => calcQuery(inp, slugOf(d, broker));

/** `search`: the query string the page was opened with; later same-page changes arrive through onNavigate. */
export default function Calculator({ d, search }: { d: Data; search: string }) {
  // the link's inputs, or the defaults: the visitor's own last inputs come from localStorage in the effect below, never
  // while rendering (this page also renders on the server)
  const [inp, setInp] = useState<CostInputs>(() => fromUrl(search, DEFAULT_INPUTS));
  const [broker, setBroker] = useState(() => brokerFromUrl(d, search) ?? "HOOD");
  const [ready, setReady] = useState(false);
  // bumped whenever the inputs change from outside the boxes (saved inputs, a link, Reset): the inputs card starts afresh
  const [rev, setRev] = useState(0);
  const focusFirst = useRef(false);
  const touched = useRef(false); // the visitor has changed something: from then on, results are announced
  const [said, setSaid] = useState("");

  useBrowserLayoutEffect(() => {
    if (!hasInputs(readQuery(search))) { setInp(loadInputs()); setRev((r) => r + 1); }
    if (!brokerFromUrl(d, search)) setBroker(savedBroker(d));
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return; // not before the saved inputs are in, or the defaults would overwrite them
    writeQuery(query(d, inp, broker));
  }, [d, ready, inp, broker]);

  // the page and the address bar stay in step on a same-page navigation too: a link with inputs (a shared view, the
  // back button) loads them, and the bare nav link to calculator/ gets the current inputs written back into the URL
  useEffect(() => onNavigate(() => {
    const loc = readLocation();
    if (parseRoute(d, loc.path).page !== "calculator") return;
    const p = readQuery(loc.search);
    if (hasInputs(p) || p.has("b")) {
      setInp(fromUrl(loc.search, loadInputs()));
      setBroker(brokerFromUrl(d, loc.search) ?? savedBroker(d));
      setRev((r) => r + 1);
    } else writeQuery(query(d, inp, broker));
  }), [d, inp, broker]);

  const set = (p: Partial<CostInputs>) => {
    const next = sanitize({ ...inp, ...p });
    touched.current = true;
    saveInputs(next);
    setInp(next);
  };
  const choose = (id: string) => { touched.current = true; saveBroker(id); setBroker(id); };
  const reset = () => { focusFirst.current = true; set(DEFAULT_INPUTS); setRev((r) => r + 1); };
  // the focus request lasts one mount of the inputs card
  useEffect(() => { focusFirst.current = false; }, [rev]);

  const lines = useMemo(() => annualCost(d, inp), [d, inp]);
  const ranked = useMemo(() => rankAll(lines), [lines]);
  const me = lines.find((l) => l.id === broker);
  const short = d.byId[broker]?.short ?? broker;
  const words = me ? headline(me).text : `No estimate for ${short}`;
  const rank = me ? rankWords(ranked, me, poolClause(inp)) : null;

  // what changed, said once the visitor pauses: the broker, the yearly figure and the rank (a screen reader hears what the
  // answer card shows; on screen the figures simply update)
  useEffect(() => {
    if (!touched.current) return;
    const t = window.setTimeout(() => setSaid(`${short}: ${words}${me ? `, ${rank ? rank.charAt(0).toLowerCase() + rank.slice(1) : "not ranked"}` : ""}.`), 700);
    return () => window.clearTimeout(t);
  }, [short, words, rank, me]);

  // built from the inputs, not from location.href, so the link always carries the view on screen
  const link = () => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query(d, inp, broker))) if (v != null) p.set(k, String(v));
    return `${location.origin}${href(pagePath("calculator"))}?${p}`;
  };
  const echo = (
    <p className="calc-echo" aria-hidden="true">
      <span className="calc-echo-in"><b>{words}</b>{me && <> at {short}</>}</span>
    </p>
  );

  return (
    <>
      <PageHeader title="What does your broker cost you a year?" />
      {/* opened from a link with inputs, the page renders afresh once the data is in (main.tsx): until then the pre-rendered
          default figures would name another broker and amount, so they wait behind a short line (index.html marks the
          page; App clears the mark once it has rendered) */}
      <p className="q-wait" role="status">Loading your numbers…</p>
      <div className="q-live">
        <div className="calc-board">
          <AnswerCard d={d} lines={lines} ranked={ranked} me={me} pick={broker} inp={inp} onPick={choose} />
          <InputsCard key={rev} inp={inp} set={set} changed={KEYS.some(([field]) => inp[field] !== DEFAULT_INPUTS[field])} onReset={reset}
            echo={echo} link={link} focusFirst={focusFirst.current} />
        </div>
        <div className="calc-more">
          <Ranking d={d} lines={lines} ranked={ranked} me={me} inp={inp} onPick={choose} />
          {lines.length > 0 && <Breakdown lines={lines} ranked={ranked} me={me} inp={inp} onPick={choose} />}
          <HowCard d={d} />
        </div>
      </div>
      <p className="sr-only" role="status">{said}</p>
    </>
  );
}
