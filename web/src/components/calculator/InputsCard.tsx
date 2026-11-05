// "How you trade": the three things every estimate needs (trades a year, their typical size, what you trade), then three
// questions answered No or Yes (options, cash kept at the broker, margin), each showing its amount box only after a Yes:
// those costs count once the visitor says they have them, never by default. "Copy link" sits at the foot with its own
// status line. On a phone or tablet the card opens with a one-line echo of the answer that stays pinned at the top of the
// screen while the boxes are on it, so a change is seen where it is made (desktop shows the answer beside the card).
import { useRef, useState, type ReactNode } from "react";
import type { CostInputs } from "../../lib/cost";
import { Icon } from "../ui";
import { MixSwitch, NumField, Question } from "./fields";
import { SPECS } from "./model";

type Extra = "options" | "idleCash" | "margin";

export function InputsCard({ inp, set, changed, onReset, echo, link, focusFirst }: {
  inp: CostInputs; set: (p: Partial<CostInputs>) => void; changed: boolean; onReset: () => void;
  /** the answer in one line, pinned above the boxes below 1024px (aria-hidden: the page's live region speaks for it) */
  echo: ReactNode;
  /** the link that opens the calculator on exactly these inputs */
  link: () => string;
  /** put focus in the first box when the card mounts (after "Reset", which the card replaces) */
  focusFirst?: boolean;
}) {
  // a Yes with no amount yet is the visitor's own answer, kept here; an amount above zero is a Yes wherever it came from
  const [asked, setAsked] = useState<Record<Extra, boolean>>(() => ({ options: inp.options > 0, idleCash: inp.idleCash > 0, margin: inp.margin > 0 }));
  // the amount behind a No, so a Yes again brings it back
  const kept = useRef<Record<Extra, number>>({ options: 0, idleCash: 0, margin: 0 });
  const yes = (k: Extra) => asked[k] || inp[k] > 0;
  const answer = (k: Extra, y: boolean) => {
    setAsked((a) => ({ ...a, [k]: y }));
    if (!y) { if (inp[k] > 0) kept.current[k] = inp[k]; set({ [k]: 0 }); }
    else if (kept.current[k] > 0 && inp[k] === 0) set({ [k]: kept.current[k] });
  };

  return (
    <section className="card calc-in" aria-labelledby="calc-in-h">
      <div className="calc-in-head">
        <h2 id="calc-in-h">How you trade</h2>
        {changed && <button type="button" className="go calc-reset" onClick={onReset}><Icon name="undo" size={18} />Reset</button>}
      </div>
      {echo}
      <div className="calc-group">
        <NumField label="Trades a year" spec={SPECS.trades} value={inp.trades} onChange={(trades) => set({ trades })} autoFocus={focusFirst} />
        <NumField label="Typical trade size" spec={SPECS.size} value={inp.size} onChange={(size) => set({ size })} />
        <MixSwitch value={inp.spMix} onChange={(spMix) => set({ spMix })} />
      </div>
      <div className="calc-group">
        <Question q="Do you trade options?" yes={yes("options")} onAnswer={(y) => answer("options", y)}>
          <NumField sub label="Contracts a year" spec={SPECS.options} value={inp.options} onChange={(options) => set({ options })} />
        </Question>
        <Question q="Do you keep cash at your broker?" yes={yes("idleCash")} onAnswer={(y) => answer("idleCash", y)}>
          <NumField sub label="Cash, on a typical day" note="not invested" spec={SPECS.idleCash} value={inp.idleCash} onChange={(idleCash) => set({ idleCash })} />
        </Question>
        <Question q="Do you borrow on margin?" yes={yes("margin")} onAnswer={(y) => answer("margin", y)}>
          <NumField sub label="Borrowed, on a typical day" spec={SPECS.margin} value={inp.margin} onChange={(margin) => set({ margin })} />
        </Question>
      </div>
      <CopyLink link={link} />
    </section>
  );
}

/** "Copy link": the link is built from the inputs on screen, and what happened is said in a status line beside the button. */
function CopyLink({ link }: { link: () => string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const say = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 6000);
  };
  const copy = () => {
    const url = link();
    const fail = () => say(false, "Couldn't copy it. The address bar holds the same link.");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => say(true, "Link copied. It opens on these numbers."), fail);
    else fail();
  };
  return (
    <div className="calc-share js-only">
      <button type="button" className="btn btn-ghost calc-copy" onClick={copy}><Icon name="link" size={20} />Copy link</button>
      <p className="calc-copied" role="status">{msg && <>{msg.ok && <Icon name="check" size={18} />}<span>{msg.text}</span></>}</p>
    </div>
  );
}
