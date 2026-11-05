// The controls' home on phones and tablets: a bottom sheet. A native modal dialog, so focus stays inside it, Escape
// closes it and the page behind is inert; its body scrolls while the page stays put, and the chart behind follows every
// pick. Closing it (Escape, the round button, the footer's button or a press on the dimmed page) hands focus back to the
// button that opened it. Its content is only rendered while it is open, so nothing is in the page twice.
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "../ui";

export function Sheet({ open, onClose, title, children, foot }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; foot: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const hid = useId();
  const closing = useRef(onClose);
  closing.current = onClose;

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      back.current = document.activeElement as HTMLElement | null;
      dlg.showModal();
      document.documentElement.classList.add("ex-locked");
    } else if (!open && dlg.open) dlg.close();
  }, [open]);

  // the dialog's own "close" (Escape included): unlock the page, put focus back, tell the page
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const closed = () => {
      document.documentElement.classList.remove("ex-locked");
      if (back.current?.isConnected) back.current.focus();
      closing.current();
    };
    dlg.addEventListener("close", closed);
    return () => { dlg.removeEventListener("close", closed); document.documentElement.classList.remove("ex-locked"); };
  }, []);

  // a desktop has the controls on the page itself: a window widened past the phone layout closes the sheet
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const check = () => { if (wide.matches) closing.current(); };
    wide.addEventListener("change", check);
    return () => wide.removeEventListener("change", check);
  }, [open]);

  return (
    // a press on the dimmed page around the sheet lands on the dialog itself (its content fills it): that closes it
    <dialog ref={ref} className="ex-sheet" aria-labelledby={hid} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ex-sheet-head">
        <h2 id={hid}>{title}</h2>
        <button type="button" className="round" onClick={onClose}><Icon name="x" size={20} /><span className="sr-only">Close</span></button>
      </div>
      <div className="ex-sheet-body">{open && children}</div>
      <div className="ex-sheet-foot">{foot}</div>
    </dialog>
  );
}
