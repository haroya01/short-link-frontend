"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";

export function RoomPanel({
  open,
  onClose,
  title,
  subtitle,
  leading,
  trailing,
  testId,
  layer = "z-50",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leading: ReactNode;
  trailing?: ReactNode;
  testId?: string;
  layer?: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [portal, setPortal] = useState(false);
  const { mounted, closing } = usePresence(open, 240);
  useEffect(() => setPortal(true), []);
  useFocusTrap(panel, { active: open, onEscape: onClose, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !portal) return null;
  return createPortal(
    <div aria-hidden={closing || undefined} className={cn("fixed inset-0", layer, closing && "pointer-events-none")}>
      <div
        aria-hidden
        onClick={onClose}
        className={cn("absolute inset-0 scrim", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900",
          "sm:bottom-auto sm:top-16 sm:mx-auto sm:max-h-[calc(100dvh-8rem)] sm:w-[34rem] sm:rounded-2xl sm:border sm:pb-0 sm:shadow-modal",
          closing
            ? "animate-[sheet-down_240ms_var(--ease)_both] sm:animate-fade-out"
            : "animate-[sheet-up_280ms_var(--ease)_both] sm:animate-fade-in",
        )}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="justify-self-start">{leading}</div>
          <div className="min-w-0 text-center">
            <h2 id={titleId} className="truncate text-[16px] font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {subtitle && <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <div className="justify-self-end">{trailing}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export const PANEL_TEXT_BUTTON =
  "focus-ring rounded px-1 text-[15px] text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white";
