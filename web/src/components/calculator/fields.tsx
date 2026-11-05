// The calculator's controls, in the world's standard forms: a number box (the shared .field pill, 16px text) that says
// what is wrong with an entry and which value the figures still use, a Yes/No question (the shared pill switch) that
// shows its amount box only after a Yes, and the three-way stock mix. Styles in calculator.css.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, Info, Segmented } from "../ui";
import { boxText, parse, stillUsing, type Spec } from "./model";

/** A number box. It keeps what the visitor types; a usable entry goes to the figures at once, anything else gets a plain
 *  line under the box (and aria-invalid) naming the problem and the value the figures still use. A box that may be left
 *  empty (an amount behind a Yes) says that nothing is counted until it has one. */
export function NumField({ label, note, value, spec, onChange, sub, autoFocus }: {
  label: string; note?: string; value: number; spec: Spec; onChange: (v: number) => void;
  /** an amount under a question: a quieter label, no rule above */
  sub?: boolean; autoFocus?: boolean;
}) {
  const id = useId();
  const box = useRef<HTMLInputElement>(null);
  const blankZero = spec.blank === "zero";
  const [text, setText] = useState(() => (blankZero && value === 0 ? "" : boxText(value, spec)));
  const [why, setWhy] = useState<string | null>(null);

  // a change from outside (a reset, another page's link) replaces what is in the box, unless the box already says it
  useEffect(() => {
    const p = parse(text, spec);
    if (p.ok && p.v === value) return;
    setText(blankZero && value === 0 ? "" : boxText(value, spec));
    setWhy(null);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoFocus) box.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const type = (t: string) => {
    setText(t);
    const p = parse(t, spec);
    if (!p.ok) { setWhy(p.why); return; }
    setWhy(null);
    if (p.v !== value) onChange(p.v);
  };
  // a usable entry is tidied once the visitor moves on ("2000" becomes "2,000"); a mistake stays as typed, with its line
  const leave = () => { const p = parse(text, spec); if (p.ok && text.trim() !== "") setText(boxText(p.v, spec)); };

  const empty = blankZero && text.trim() === "" && !why;
  const say = why ? `${why}. ${stillUsing(value, spec)}` : empty ? (spec.usd ? "Enter an amount to count it." : "Enter how many to count them.") : "";
  const noteId = `${id}-n`, sayId = `${id}-s`;
  return (
    <div className={`calc-num${sub ? " is-sub" : ""}`}>
      <div className="calc-row">
        <label htmlFor={id} className="calc-l">{label}{note && <small id={noteId}>{note}</small>}</label>
        <span className={`field calc-field${why ? " is-bad" : ""}`}>
          {spec.usd && <span className="calc-pre" aria-hidden="true">$</span>}
          <input ref={box} id={id} type="text" inputMode={spec.usd ? "decimal" : "numeric"} autoComplete="off" spellCheck={false}
            value={text} onChange={(e) => type(e.target.value)} onBlur={leave}
            aria-invalid={why ? true : undefined} aria-describedby={[note ? noteId : "", say ? sayId : ""].filter(Boolean).join(" ") || undefined} />
        </span>
      </div>
      {/* always in the page, so a screen reader hears the line when it appears */}
      <p id={sayId} className={`calc-say${why ? " is-bad" : ""}`} aria-live="polite">
        {say && <>{why && <Icon name="alert" size={18} />}<span>{say}</span></>}
      </p>
    </div>
  );
}

/** A question answered No or Yes on the pill switch; its amount box (children) shows only after a Yes. The question is
 *  the switch's name, so it is read once. */
export function Question({ q, yes, onAnswer, children }: { q: string; yes: boolean; onAnswer: (yes: boolean) => void; children: ReactNode }) {
  return (
    <div className="calc-q">
      <div className="calc-row calc-yn">
        <p className="calc-l" aria-hidden="true">{q}</p>
        <Segmented<"no" | "yes"> label={q} value={yes ? "yes" : "no"} onChange={(v) => onAnswer(v === "yes")} options={[["no", "No"], ["yes", "Yes"]]} />
      </div>
      {yes && children}
    </div>
  );
}

/** What the visitor trades: all S&P 500 stocks, half and half, or all other stocks (percent of trades in the S&P 500). */
export function MixSwitch({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="calc-mix">
      <div className="calc-mix-l">
        <span className="calc-l" aria-hidden="true">What you trade</span>
        <Info topic="what you trade">S&amp;P 500: the large US companies in that index, such as Apple and Microsoft. Other stocks: every other stock, ETFs included. A mix: half of each.</Info>
      </div>
      <Segmented<number> label="What you trade" value={value} onChange={onChange} options={[[100, "S&P 500"], [50, "A mix"], [0, "Other stocks"]]} />
    </div>
  );
}
