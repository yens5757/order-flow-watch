// "Copy link": the explorer's whole view lives in its address, so the link is the view to share. The outcome is said in
// a status line beside the button (screen readers hear it too) and clears after a few seconds.
import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui";

export function CopyLink() {
  const [said, setSaid] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(location.href);
      ok = true;
    } catch { /* no clipboard access (an old browser, a refused permission): say how to share instead */ }
    setSaid(ok ? "Link copied" : "Couldn't copy it: use the address bar");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaid(""), 4000);
  };
  return (
    <>
      <button type="button" className="btn btn-ghost js-only" onClick={copy}><Icon name="link" size={20} />Copy link</button>
      <span className="ex-said" role="status">{said}</span>
    </>
  );
}
