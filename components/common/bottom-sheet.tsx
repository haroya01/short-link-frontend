"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";

/**
 * Phone-first action sheet: slides up from the bottom edge into the thumb zone, scrim tap or
 * Escape closes it, focus stays inside while open. Portalled to <body> so a transformed ancestor
 * can't trap the fixed layer.
 */
export function BottomSheet({
  open,
  onClose,
  label,
  panelClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { mounted, closing } = usePresence(open, 240);
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);
  useFocusTrap(ref, { active: open, onEscape: onClose });

  if (!mounted || !portalReady) return null;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={closing || undefined}
      className={`fixed inset-0 z-50 ${closing ? "pointer-events-none" : ""}`}
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 scrim motion-reduce:animate-none ${
          closing ? "animate-[overlay-out_240ms_var(--ease)_both]" : "animate-fade-in"
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900 ${
          closing ? "animate-[sheet-down_240ms_var(--ease)_both]" : "animate-[sheet-up_280ms_var(--ease)_both]"
        } ${panelClassName ?? ""}`}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
