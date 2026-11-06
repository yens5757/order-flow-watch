// What the visitor typed and picked, remembered in this browser: the calculator page and the home page share them. Only
// the visitor's own edits are saved (as they type or pick); opening a link never replaces what is saved here.
import { DEFAULT_INPUTS, type CostInputs } from "../../lib/cost";
import { sanitize } from "./model";

const STORE = "calc"; // localStorage: the visitor's inputs
const BROKER = "broker"; // localStorage: the visitor's broker, the same key the home-page picker uses

/** Saved inputs over the defaults; anything odd in storage falls back to the default for that field, and what is left is
 *  held to what the boxes accept (model.ts sanitize). */
export function loadInputs(): CostInputs {
  const out = { ...DEFAULT_INPUTS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<CostInputs> | null;
    if (raw) for (const k of Object.keys(out) as (keyof CostInputs)[]) { const v = Number(raw[k]); if (Number.isFinite(v) && v >= 0) out[k] = v; }
  } catch { /* private mode or bad JSON: defaults */ }
  return sanitize(out);
}
export function saveInputs(i: CostInputs) { try { localStorage.setItem(STORE, JSON.stringify(i)); } catch { /* private mode: the inputs just won't persist */ } }
export const loadBroker = () => { try { return localStorage.getItem(BROKER) ?? "HOOD"; } catch { return "HOOD"; } };
/** The broker the visitor picked, only if they have picked one here (no default): the explorer's scatter names it. */
export const savedBroker = () => { try { return localStorage.getItem(BROKER); } catch { return null; } };
export const saveBroker = (id: string) => { try { localStorage.setItem(BROKER, id); } catch { /* private mode */ } };
