"use client";

import { useEffect, useRef, type RefObject } from "react";

const openTraps: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

type Options = {
  active: boolean;
  onEscape?: () => void;
  autoFocus?: boolean;
};

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { active, onEscape, autoFocus = true }: Options,
) {
  // A ref, so an inline arrow doesn't re-arm the trap (and re-fire the focus restore) every render.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const token = Symbol();
    openTraps.push(token);
    const restoreTo = document.activeElement as HTMLElement | null;
    if (autoFocus) {
      // After a paint — the container mounts in the same commit that flips `active`.
      requestAnimationFrame(() => {
        const target = focusableElements(ref.current)[0] ?? ref.current;
        target?.focus();
      });
    }
    const onKey = (e: KeyboardEvent) => {
      if (openTraps[openTraps.length - 1] !== token) return;
      if (e.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = focusableElements(ref.current);
      if (focusable.length === 0) {
        e.preventDefault();
        ref.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inside = current instanceof HTMLElement && ref.current?.contains(current) && current !== ref.current;
      if (e.shiftKey && (!inside || current === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || current === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openTraps.splice(openTraps.indexOf(token), 1);
      restoreTo?.focus?.();
    };
  }, [active, autoFocus, ref]);
}
