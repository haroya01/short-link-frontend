"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const RichCommentInput = dynamic(
  () => import("./rich-comment-input").then((module) => module.RichCommentInput),
  { ssr: false, loading: () => <div className="h-12 rounded-lg border border-slate-200 dark:border-slate-700" /> },
);

/** Keep the quote and draft mounted until the server confirms saving. */
export function HighlightNoteSheet({ quote, onCancel, onSave }: {
  quote: string;
  onCancel: () => void;
  onSave: (note: string) => Promise<boolean>;
}) {
  const t = useTranslations("publicPost");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [discard, setDiscard] = useState(false);
  const pendingRef = useRef(false);
  const inset = useKeyboardInset();
  const sheetRef = useRef<HTMLDivElement>(null);

  function requestCancel() {
    if (pendingRef.current) return;
    if (discard) setDiscard(false);
    else if (note.trim()) setDiscard(true);
    else onCancel();
  }
  useFocusTrap(sheetRef, { active: true, onEscape: requestCancel, autoFocus: false });

  async function submit() {
    if (pendingRef.current || note.length > 500) return;
    pendingRef.current = true;
    setPending(true);
    setError(false);
    try {
      if (!await onSave(note)) setError(true);
    } catch {
      setError(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ paddingBottom: inset }}
      onMouseDown={requestCancel}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-sheet-title"
        aria-describedby="note-sheet-scope"
        aria-busy={pending}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:max-w-md sm:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3 id="note-sheet-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("highlightNoteTitle")}</h3>
        <p id="note-sheet-scope" className="mt-2 flex gap-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          <Globe aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {t("highlightPublicScope")}
        </p>
        <blockquote className="mt-3 line-clamp-3 border-l-2 border-accent-300 pl-3 text-[13px] leading-relaxed text-slate-500 dark:border-accent-500/40 dark:text-slate-400">
          {quote}
        </blockquote>
        <div className="mt-3" ref={(element) => { if (element) element.inert = pending; }}>
          <RichCommentInput
            value={note}
            onChange={(value) => { if (!pendingRef.current) setNote(value); }}
            placeholder={t("highlightNotePlaceholder")}
            maxLength={500}
            rows={3}
            autoFocus
            compact
            onSubmitShortcut={() => void submit()}
          />
        </div>
        <p aria-live="polite" className="mt-1 text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400">{note.length}/500</p>
        {error && <p role="alert" className="mt-2 text-[13px] text-red-600 dark:text-red-400">{t("highlightSaveError")}</p>}
        {discard ? (
          <div role="alert" className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("highlightDiscardConfirm")}</p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("highlightDiscardBody")}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="focus-ring rounded-lg px-3.5 py-2 text-sm text-slate-600 dark:text-slate-300" onClick={() => setDiscard(false)}>{t("highlightKeepEditing")}</button>
              <button type="button" className="focus-ring rounded-lg px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400" onClick={onCancel}>{t("highlightDiscard")}</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={requestCancel} disabled={pending} className="focus-ring rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">{t("highlightNoteCancel")}</button>
            <button type="button" onClick={() => void submit()} disabled={pending || note.length > 500} className="focus-ring rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800 disabled:opacity-50">{t(pending ? "highlightSaving" : "highlightNoteSave")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
