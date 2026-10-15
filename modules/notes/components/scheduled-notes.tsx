"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Clock, CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import {
  cancelScheduledNote,
  listScheduledNotes,
  rescheduleNote,
  type ScheduledNote,
} from "@/modules/notes/api/notes";

const LEAD_MS = 5 * 60 * 1000 + 30 * 1000;

/** A datetime-local value (local wall time, minutes) for a moment. */
export function toLocalInput(at: Date): string {
  const shifted = new Date(at.getTime() - at.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export function earliestLocal(): string {
  return toLocalInput(new Date(Date.now() + LEAD_MS));
}

export function defaultLocal(): string {
  const at = new Date(Date.now() + 60 * 60 * 1000);
  at.setSeconds(0, 0);
  return toLocalInput(at);
}

export function scheduleError(error: unknown): "scheduleTooSoon" | "scheduleLimit" | "scheduleFailed" {
  const code = error instanceof ApiError ? error.detail.code : undefined;
  if (code === "NOTE_SCHEDULE_TOO_SOON") return "scheduleTooSoon";
  if (code === "NOTE_SCHEDULE_LIMIT") return "scheduleLimit";
  return "scheduleFailed";
}

const REASONS = new Set([
  "NOTE_NOT_FOUND",
  "NOTE_QUOTED_NOTE_NOT_FOUND",
  "NOTE_QUOTE_NOT_FOUND",
  "NOTE_REPLY_BLOCKED",
  "NOTE_IMAGE_INVALID",
]);

export function useWhen() {
  const locale = useLocale();
  return (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
}

/** Under the composer: notes waiting for their time, and ones that could not be posted. */
export function ScheduledNotesPanel({ version }: { version: number }) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const when = useWhen();
  const [items, setItems] = useState<ScheduledNote[]>([]);
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState<number | null>(null);
  const [draftAt, setDraftAt] = useState("");

  useEffect(() => {
    let alive = true;
    listScheduledNotes()
      .then((found) => alive && setItems(found))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [version]);

  if (items.length === 0) return null;

  async function cancel(note: ScheduledNote) {
    try {
      await cancelScheduledNote(note.id);
      setItems((current) => current.filter((n) => n.id !== note.id));
      toast(t("scheduledCanceled"));
    } catch {
      toast(t("scheduleFailed"), "error");
    }
  }

  async function move(note: ScheduledNote) {
    try {
      const moved = await rescheduleNote(note.id, new Date(draftAt).toISOString());
      setItems((current) =>
        [...current.filter((n) => n.id !== moved.id), moved].sort((a, b) =>
          a.scheduledAt.localeCompare(b.scheduledAt),
        ),
      );
      setMoving(null);
      toast(t("scheduledMoved"));
    } catch (error) {
      toast(t(scheduleError(error)), "error");
    }
  }

  return (
    <section aria-labelledby="scheduled-notes-title" className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
      <button
        type="button"
        id="scheduled-notes-title"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring inline-flex items-center gap-1.5 rounded py-1 text-[13px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {t("scheduledTitle", { count: items.length })}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((note) => (
            <li key={note.id} className="py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[13px] font-semibold",
                    note.failure ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100",
                  )}
                >
                  {note.failure ? (
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {when(note.scheduledAt)}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMoving(moving === note.id ? null : note.id);
                      setDraftAt(toLocalInput(new Date(Math.max(Date.parse(note.scheduledAt), Date.now() + LEAD_MS))));
                    }}
                    className="focus-ring rounded text-[12px] font-medium text-accent-700 hover:underline dark:text-accent-300"
                  >
                    {t("scheduledMove")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void cancel(note)}
                    aria-label={t("scheduledCancelLabel", { when: when(note.scheduledAt) })}
                    className="focus-ring rounded text-[12px] font-medium text-slate-500 hover:text-red-600 dark:text-slate-400"
                  >
                    {t("scheduledCancel")}
                  </button>
                </span>
              </div>
              {note.body && <p className="mt-1 line-clamp-2 text-[14px] text-slate-700 dark:text-slate-200">{note.body}</p>}
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-slate-500 dark:text-slate-400">
                {note.imageCount > 0 && <span>{t("scheduledImages", { count: note.imageCount })}</span>}
                {note.poll && <span>{t("scheduledPoll")}</span>}
                {note.inReplyToId != null && <span>{t("scheduledReply")}</span>}
                {(note.quotedNoteId != null || note.quotedPostId != null) && <span>{t("scheduledQuote")}</span>}
              </p>
              {note.failure && (
                <p className="mt-0.5 text-[12px] text-red-600 dark:text-red-400">
                  {t(`scheduledFailure.${REASONS.has(note.failure) ? note.failure : "other"}`)}
                </p>
              )}
              {moving === note.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={draftAt}
                    min={earliestLocal()}
                    onChange={(e) => setDraftAt(e.target.value)}
                    aria-label={t("scheduleLabel")}
                    className="focus-ring rounded-surface border border-slate-200 bg-transparent px-2 py-1 text-[13px] dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => void move(note)}
                    disabled={!draftAt}
                    className="focus-ring rounded-full bg-accent-700 px-3 py-1 text-[12px] font-semibold text-white hover:bg-accent-800 disabled:opacity-40"
                  >
                    {t("scheduledSave")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
