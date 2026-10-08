"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { useAuth } from "@/lib/auth";
import type { Note, NoteFeed, NoteFilterContext } from "@/modules/notes/api/notes";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { NoteCard } from "./note-card";

/** `initial` is the anonymous server render; page 0 is refetched with the session so the viewer's
 *  likes and own like counts fill in. */
export function NoteList({
  load,
  initial = null,
  empty,
  prepend = [],
  onQuoted,
  repostedBy,
  showsPin = false,
  filterContext,
}: {
  load: (page: number) => Promise<NoteFeed>;
  initial?: NoteFeed | null;
  empty: React.ReactNode;
  prepend?: Note[];
  onQuoted?: (note: Note) => void;
  repostedBy?: string;
  showsPin?: boolean;
  filterContext?: NoteFilterContext;
}) {
  const t = useTranslations("notes");
  const filters = useNoteFilters();
  const { me } = useAuth();
  const [items, setItems] = useState<Note[]>(initial?.items ?? []);
  const [page, setPage] = useState(initial?.page ?? 0);
  const [hasNext, setHasNext] = useState(initial?.hasNext ?? false);
  const [state, setState] = useState<"loading" | "ready" | "error">(initial ? "ready" : "loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(() => {
    setState((current) => (current === "ready" ? current : "loading"));
    load(0)
      .then((feed) => {
        setItems(feed.items);
        setPage(0);
        setHasNext(feed.hasNext);
        setState("ready");
      })
      .catch(() => setState((current) => (current === "ready" ? current : "error")));
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (prepend.length === 0) return;
    setItems((current) => [...prepend.filter((n) => !current.some((c) => c.id === n.id)), ...current]);
  }, [prepend]);

  async function more() {
    setLoadingMore(true);
    try {
      const feed = await load(page + 1);
      setItems((current) => [...current, ...feed.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setPage(feed.page);
      setHasNext(feed.hasNext);
    } finally {
      setLoadingMore(false);
    }
  }

  const verdicts = new Map(items.map((note) => [note.id, noteVerdict(note, filters, filterContext, me?.id)]));
  const shown = items.filter((note) => verdicts.get(note.id)?.action !== "hide");
  const fresh = new Set(prepend.map((n) => n.id));

  if (state === "loading" && shown.length === 0) {
    return <div className="py-10" aria-busy />;
  }
  if (state === "error" && shown.length === 0) {
    return <ErrorState title={t("loadFailed")} onRetry={reload} />;
  }
  if (shown.length === 0) return <>{empty}</>;

  return (
    <div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isNew={fresh.has(note.id)}
            repostedBy={repostedBy ?? note.repostedBy?.username}
            onQuoted={onQuoted}
            showsPin={showsPin}
            filteredBy={(() => {
              const verdict = verdicts.get(note.id);
              return verdict?.action === "warn" ? verdict.phrases : undefined;
            })()}
            onChange={(next) => {
              if (next.pinned !== note.pinned) {
                reload();
                return;
              }
              setItems((current) => current.map((c) => (c.id === next.id ? next : c)));
            }}
            onDelete={(id) => setItems((current) => current.filter((c) => c.id !== id))}
          />
        ))}
      </div>
      {hasNext && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={more}
            disabled={loadingMore}
            className="focus-ring rounded-surface border border-slate-300 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
