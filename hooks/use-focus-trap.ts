"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

type Options = {
  /** Trap is mounted but inert while false (e.g. a closed dialog that renders null). */
  active: boolean;
  /**
   * Escape handler. The trap doesn't close anything itself — the caller owns open state and may
   * gate the close (busy guard, confirm step). Kept in a ref so an inline arrow doesn't re-arm
   * the trap (and re-fire the restore) every render.
   */
  onEscape?: () => void;
  /**
   * Move focus to the first focusable element (or the container) on activation. Turn off when the
   * caller places initial focus itself — e.g. a search sheet that focuses its input.
   */
  autoFocus?: boolean;
};

/**
 * Keyboard containment for anything that declares {@code aria-modal}: initial focus, Tab/Shift+Tab
 * cycling within the container, Escape, and focus restore to the opener on deactivation. Extracted
 * from ConfirmDialog so the other modal surfaces (lightboxes, bottom sheets, the publish panel)
 * share one implementation instead of each re-deriving a partial one — declaring {@code aria-modal}
 * without actually containing focus leaves keyboard users tabbing into the inert page behind the
 * overlay.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { active, onEscape, autoFocus = true }: Options,
) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    if (autoFocus) {
      // After a paint — the container mounts in the same commit that flips `active`.
      requestAnimationFrame(() => {
        const target = focusableElements(ref.current)[0] ?? ref.current;
        target?.focus();
      });
    }
    const onKey = (e: KeyboardEvent) => {
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
      // Focus outside the container (or on it) snaps back to an edge instead of cycling the page.
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
      restoreTo?.focus?.();
    };
  }, [active, autoFocus, ref]);
}
