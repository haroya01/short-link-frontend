"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Layers, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/components/ui/toast";
import { appendNoteToSeries, createSeries, listSeries, type SeriesView } from "@/modules/blog/api/series";
import { seriesItemCount, seriesSlugFromTitle } from "@/modules/blog/lib/series-items";

export function NoteSeriesDialog({
  noteId,
  open,
  onClose,
}: {
  noteId: number;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("notes");
  const tf = useTranslations("publicFeed");
  const { toast } = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [series, setSeries] = useState<SeriesView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setSeries(null);
    setFailed(false);
    listSeries()
      .then((loaded) => live && setSeries(loaded))
      .catch(() => {
        if (!live) return;
        setSeries([]);
        setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [open]);

  useFocusTrap(panel, { active: open, onEscape: onClose, autoFocus: true });

  function failure(e: unknown): string {
    const code = e instanceof ApiError ? e.detail.code : undefined;
    if (code === "SERIES_NOTE_NOT_SHARED") return t("seriesNotShared");
    if (code === "SERIES_NOTE_NOT_FOUND") return t("seriesNoteGone");
    if (code === "PERMISSION_DENIED") return t("seriesNotYours");
    if (code === "SERIES_SLUG_CONFLICT") return t("seriesSlugTaken");
    return t("addToSeriesFailed");
  }

  async function addTo(target: SeriesView) {
    setBusy(target.id);
    try {
      const added = await appendNoteToSeries(target.id, noteId);
      toast(added ? t("addedToSeries", { title: target.title }) : t("alreadyInSeries", { title: target.title }));
      onClose();
    } catch (e) {
      toast(failure(e), "error");
    } finally {
      setBusy(null);
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy !== null) return;
    setBusy("new");
    try {
      const created = await createSeries({ title: trimmed, slug: seriesSlugFromTitle(trimmed) });
      setSeries((current) => [created.series, ...(current ?? [])]);
      setTitle("");
      await appendNoteToSeries(created.series.id, noteId);
      toast(t("addedToSeries", { title: created.series.title }));
      onClose();
    } catch (err) {
      toast(failure(err), "error");
    } finally {
      setBusy(null);
    }
  }

  if (!present || !mounted) return null;

  return createPortal(
    <div
      aria-hidden={closing || undefined}
      className={cn("fixed inset-0 z-50 overflow-y-auto px-4 pt-12 sm:pt-20", closing && "pointer-events-none")}
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
          "relative mx-auto w-full max-w-sm rounded-surface border border-slate-200 bg-white shadow-modal dark:border-slate-800 dark:bg-slate-850",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 id={titleId} className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {t("addToSeries")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded px-1 text-[15px] text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            {t("close")}
          </button>
        </div>
        {series === null ? (
          <p className="flex justify-center px-4 py-6 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-label={t("loading")} />
          </p>
        ) : series.length === 0 ? (
          <p className="px-4 py-5 text-[14px] text-slate-500 dark:text-slate-400">
            {failed ? t("seriesLoadFailed") : t("seriesNone")}
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto p-1">
            {series.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => addTo(s)}
                  disabled={busy !== null}
                  className="focus-ring flex w-full items-center gap-2.5 rounded-surface px-3 py-2.5 text-left text-[14px] text-slate-800 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Layers aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {busy === s.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden />
                  ) : (
                    <span className="shrink-0 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                      {tf("seriesItemCount", { count: seriesItemCount(s) })}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createAndAdd} className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={t("seriesNewTitle")}
            aria-label={t("seriesNewTitle")}
            className="focus-ring min-w-0 flex-1 rounded-surface border border-slate-300 bg-transparent px-2.5 py-1.5 text-[14px] dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={!title.trim() || busy !== null}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-700 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-800 disabled:opacity-40"
          >
            {busy === "new" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {t("seriesCreateAndAdd")}
          </button>
        </form>
        <p className="px-4 pb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("addToSeriesHint")}</p>
      </div>
    </div>,
    document.body,
  );
}
