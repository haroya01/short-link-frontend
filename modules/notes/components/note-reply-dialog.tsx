"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { Avatar } from "@/modules/blog/components/avatar";
import { AuthorName, STRONG_NAME } from "@/modules/blog/components/author-name";
import { contentLang } from "@/modules/blog/lib/content-lang";
import type { Note } from "@/modules/notes/api/notes";
import { NoteComposer } from "./note-composer";

export function NoteReplyDialog({
  target,
  onClose,
  onReplied,
}: {
  target: Note | null;
  onClose: () => void;
  onReplied: (reply: Note) => void;
}) {
  const t = useTranslations("notes");
  const open = target !== null;
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState<Note | null>(target);
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (target) setShown(target);
  }, [target]);

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

  const excerpt = shown.contentWarning
    ? shown.contentWarning
    : shown.body || (shown.media.length > 0 ? t("mediaCount", { count: shown.media.length }) : "");

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
        data-testid="note-reply-dialog"
        className={cn(
          "relative mx-auto w-full max-w-xl rounded-surface border border-slate-200 bg-white shadow-modal dark:border-slate-800 dark:bg-slate-850",
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
            {t("replySheetTitle")}
          </h2>
        </div>
        <div className="px-4 pb-1 pt-3">
          <div className="flex gap-3" data-testid="note-reply-target">
            <div aria-hidden className="flex shrink-0 flex-col items-center">
              <Avatar
                src={shown.author.avatarUrl}
                name={shown.author.displayName || shown.author.username}
                handle={shown.author.username}
                size="md"
              />
              <span className="mt-1 w-0.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="min-w-0 flex-1 pb-5 text-[15px] leading-5">
              <AuthorName name={shown.author.displayName} handle={shown.author.username} className={STRONG_NAME} />
              {excerpt && (
                <p
                  lang={contentLang(excerpt, shown.language)}
                  className={cn(
                    "mt-0.5 line-clamp-4 whitespace-pre-wrap break-words leading-[1.45]",
                    shown.contentWarning ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200",
                  )}
                >
                  {excerpt}
                </p>
              )}
            </div>
          </div>
          <NoteComposer
            key={shown.id}
            inReplyToId={shown.id}
            threadReplyPolicy={shown.replyPolicy}
            autoFocus
            onCreated={onReplied}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
