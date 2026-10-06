"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import type { Note, QuotedNote } from "@/modules/notes/api/notes";
import { NoteComposer } from "./note-composer";

export function NoteQuoteDialog({
  quoted,
  onClose,
  onPosted,
}: {
  quoted: QuotedNote | null;
  onClose: () => void;
  onPosted: (note: Note) => void;
}) {
  const t = useTranslations("notes");
  const open = quoted !== null;
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState<QuotedNote | null>(quoted);
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (quoted) setShown(quoted);
  }, [quoted]);

  useFocusTrap(panel, { active: open, onEscape: onClose, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!present || !mounted || !shown) return null;

  return createPortal(
    <div
      aria-hidden={closing || undefined}
      className={cn(
        "fixed inset-0 z-50 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 sm:pt-20",
        closing && "pointer-events-none",
      )}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn("fixed inset-0 scrim", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-modal dark:border-slate-800 dark:bg-slate-850",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring justify-self-start rounded px-1 text-[15px] text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            {t("cancel")}
          </button>
          <h2 id={titleId} className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {t("quoteTitle")}
          </h2>
        </div>
        <div className="px-4 pb-1">
          <NoteComposer key={shown.id} quotedNote={shown} autoFocus onCreated={onPosted} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
