"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import type { Note, NoteRoom, QuotedNote, QuotedPost } from "@/modules/notes/api/notes";
import type { NoteDraft } from "@/modules/notes/lib/note-drafts";
import { NoteComposer } from "./note-composer";
import { NoteDraftsButton } from "./note-drafts-sheet";

type Kept = { hasContent: boolean; id: string | null; unsaved: boolean };

type Quoted =
  | { note: QuotedNote; room?: NoteRoom | null }
  | { post: QuotedPost; room?: NoteRoom | null }
  | { fresh: true; title: string; draft?: NoteDraft; room?: NoteRoom };

export function NoteQuoteDialog({
  quoted,
  onClose,
  onPosted,
}: {
  quoted: Quoted | null;
  onClose: () => void;
  onPosted: (note: Note) => void;
}) {
  const t = useTranslations("notes");
  const tPost = useTranslations("publicPost");
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const asking = useRef(false);
  const open = quoted !== null;
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState<Quoted | null>(quoted);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [kept, setKept] = useState<Kept>({ hasContent: false, id: null, unsaved: false });
  const { mounted: present, closing } = usePresence(open, 160);

  const opened = useRef(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!quoted) {
      opened.current = false;
      return;
    }
    setShown(quoted);
    if (opened.current) return;
    opened.current = true;
    setDraft("fresh" in quoted ? quoted.draft ?? null : null);
  }, [quoted]);

  const close = async () => {
    if (asking.current) return;
    if (kept.unsaved) {
      asking.current = true;
      const discard = await confirm({
        title: t("discardTitle"),
        confirmLabel: tPost("highlightReplyDiscard"),
        cancelLabel: tPost("highlightReplyKeepWriting"),
        destructive: true,
      });
      asking.current = false;
      if (!discard) return;
    }
    if (kept.hasContent) toast(t("draftSaved"));
    onClose();
  };
  const onDraftChange = useCallback((state: Kept) => {
    setKept((current) =>
      current.hasContent === state.hasContent && current.id === state.id && current.unsaved === state.unsaved
        ? current
        : state,
    );
  }, []);

  useFocusTrap(panel, { active: open, onEscape: close, autoFocus: false });

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
        onClick={close}
        className={cn("fixed inset-0 scrim", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative mx-auto w-full max-w-xl rounded-surface border border-slate-200 bg-white shadow-modal dark:border-slate-800 dark:bg-slate-850",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={close}
            className="focus-ring justify-self-start rounded px-1 text-[15px] text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            {t("cancel")}
          </button>
          <h2 id={titleId} className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {"fresh" in shown ? shown.title : "note" in shown ? t("quoteTitle") : t("quoteAction")}
          </h2>
          {shown.room ? (
            <span />
          ) : (
            <NoteDraftsButton onPick={(next) => setDraft(next)} currentId={kept.id} className="justify-self-end" />
          )}
        </div>
        <div className="px-4 pb-1">
          {draft ? (
            <NoteComposer
              key={`draft-${draft.id}`}
              draft={draft}
              quote={draft.quote && "post" in draft.quote ? draft.quote.post : null}
              quotedNote={draft.quote && "note" in draft.quote ? draft.quote.note : null}
              autoFocus
              onCreated={onPosted}
              onDraftChange={onDraftChange}
            />
          ) : "fresh" in shown ? (
            <NoteComposer
              key={`fresh-${shown.room?.id ?? "mine"}`}
              autoFocus
              room={shown.room ?? null}
              onCreated={onPosted}
              onDraftChange={onDraftChange}
            />
          ) : "note" in shown ? (
            <NoteComposer
              key={`note-${shown.note.id}`}
              quotedNote={shown.note}
              room={shown.room ?? null}
              autoFocus
              onCreated={onPosted}
              onDraftChange={onDraftChange}
            />
          ) : (
            <NoteComposer
              key={`post-${shown.post.id}`}
              quote={shown.post}
              room={shown.room ?? null}
              autoFocus
              onCreated={onPosted}
              onDraftChange={onDraftChange}
            />
          )}
        </div>
      </div>
      {confirmDialog}
    </div>,
    document.body,
  );
}
