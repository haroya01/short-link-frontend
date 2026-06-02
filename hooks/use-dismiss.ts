import { useEffect, useRef, type RefObject } from "react";

/**
 * Close a popover / menu / dropdown when it's `open` and the user clicks outside `ref` (mousedown) or
 * presses Escape. Consolidates the effect that was hand-rolled in every popover (account menu, report,
 * saved-card, schedule, revisions, …). `onClose` is read through a ref, so passing an inline arrow
 * doesn't re-subscribe the listeners on every render.
 */
export function useDismiss(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  // Close on Escape too. Off for popovers nested inside a dialog that owns Escape itself, so the two
  // don't both fire on one keypress (preserves the outside-click-only behaviour there).
  { escape = true }: { escape?: boolean } = {},
) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cb.current();
    };
    document.addEventListener("mousedown", onDown);
    if (escape) document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      if (escape) document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, escape]);
}
