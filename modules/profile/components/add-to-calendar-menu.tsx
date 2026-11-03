"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "@/modules/profile/lib/calendar-export";

const MENU_HEIGHT = 160;

export function AddToCalendarMenu({
  event,
  uid,
  filename,
  label,
  labels,
  className,
  tone = "site",
}: {
  event: CalendarEvent;
  uid: string;
  filename: string;
  label: string;
  labels: { google: string; outlook: string; ics: string };
  className: string;
  tone?: "site" | "light";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const top = below < MENU_HEIGHT && r.top > MENU_HEIGHT ? r.top - MENU_HEIGHT - 4 : r.bottom + 4;
    setPos({ top, left: r.left, width: Math.max(r.width, 220) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const google = googleCalendarUrl(event);
  const outlook = outlookCalendarUrl(event);
  const item = cn(
    "flex w-full items-center px-3.5 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50",
    tone === "site" && "dark:text-slate-200 dark:hover:bg-slate-800",
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={cn("h-3.5 w-3.5 opacity-70 transition-transform duration-200 ease-[var(--ease)]", open && "rotate-180")}
        />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
              className={cn(
                "z-[100] origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-left shadow-float animate-dropdown-in",
                tone === "site" && "dark:border-slate-700 dark:bg-slate-850",
              )}
            >
              {google ? (
                <a role="menuitem" href={google} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={item}>
                  {labels.google}
                </a>
              ) : null}
              {outlook ? (
                <a role="menuitem" href={outlook} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={item}>
                  {labels.outlook}
                </a>
              ) : null}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  downloadIcs(event, filename, uid);
                  setOpen(false);
                }}
                className={item}
              >
                {labels.ics}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
