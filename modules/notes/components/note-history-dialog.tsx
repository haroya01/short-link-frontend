"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { getNoteHistory, type NoteHistory } from "@/modules/notes/api/notes";

export function NoteHistoryDialog({ noteId, open, onClose }: { noteId: number; open: boolean; onClose: () => void }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<NoteHistory | null>(null);
  const [failed, setFailed] = useState(false);
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    let live = true;
    getNoteHistory(noteId)
      .then((loaded) => live && setHistory(loaded))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [open, noteId]);

  useFocusTrap(panel, { active: open, onEscape: onClose, autoFocus: true });

  if (!present || !mounted) return null;

  const when = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

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
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 id={titleId} className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {t("historyTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded px-1 text-[15px] text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            {t("close")}
          </button>
        </div>
        {failed ? (
          <p className="px-4 py-6 text-[14px] text-slate-500 dark:text-slate-400">{t("historyFailed")}</p>
        ) : !history ? (
          <p className="px-4 py-6 text-[14px] text-slate-500 dark:text-slate-400">{t("loading")}</p>
        ) : (
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.versions.map((version, index) => (
              <li key={index} className="px-4 py-3" data-note-version={index}>
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  <span className={cn("font-semibold", index === 0 && "text-slate-900 dark:text-slate-100")}>
                    {index === 0 ? t("historyNow") : t("historyEarlier")}
                  </span>
                  {version.at && <span> · {when.format(new Date(version.at))}</span>}
                </p>
                {version.contentWarning && (
                  <p className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-slate-900 dark:text-slate-100">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {version.contentWarning}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-slate-800 dark:text-slate-200">
                  {version.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>,
    document.body,
  );
}
