import { useCallback, type KeyboardEvent, type RefObject } from "react";

export function useMenuKeys(
  container: RefObject<HTMLElement | null>,
  {
    onClose,
    items = '[role="menuitem"]',
    tabCloses = true,
    onEdge,
  }: {
    onClose: (refocus: boolean) => void;
    items?: string;
    tabCloses?: boolean;
    onEdge?: (edge: "start" | "end") => boolean;
  },
) {
  const list = useCallback(
    () =>
      Array.from(container.current?.querySelectorAll<HTMLElement>(items) ?? []).filter(
        (el) => el.checkVisibility?.() ?? true,
      ),
    [container, items],
  );

  const focusFirst = useCallback(() => list()[0]?.focus(), [list]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const all = list();
      const index = all.indexOf(document.activeElement as HTMLElement);
      const focusAt = (next: number) => all[(next + all.length) % all.length]?.focus();
      if (event.key === "ArrowDown") {
        if (index === all.length - 1 && onEdge?.("end")) return event.preventDefault();
        focusAt(index + 1);
      } else if (event.key === "ArrowUp") {
        if (index === 0 && onEdge?.("start")) return event.preventDefault();
        focusAt(index < 0 ? all.length - 1 : index - 1);
      } else if (event.key === "Home") focusAt(0);
      else if (event.key === "End") focusAt(all.length - 1);
      else if (event.key === "Escape") onClose(true);
      else if (event.key === "Tab" && tabCloses) return onClose(false);
      else return;
      event.preventDefault();
    },
    [list, onClose, tabCloses, onEdge],
  );

  return { onKeyDown, focusFirst };
}
