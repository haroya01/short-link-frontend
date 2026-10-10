"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { useAuth } from "@/lib/auth";
import type { Note, NoteFeed, NoteFilterContext } from "@/modules/notes/api/notes";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { SrLoading } from "@/modules/blog/components/sr-loading";
import { NoteCard } from "./note-card";
import { noteHref } from "@/modules/notes/lib/note-href";

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
  const locale = useLocale();
  const filters = useNoteFilters();
  const blocked = useBlockedNames();
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
  const shown = items.filter(
    (note) => verdicts.get(note.id)?.action !== "hide" && !blocked.has(note.author.username),
  );
  const fresh = new Set(prepend.map((n) => n.id));

  if (state === "loading" && shown.length === 0) {
    return <NoteListSkeleton />;
  }
  if (state === "error" && shown.length === 0) {
    return <ErrorState title={t("loadFailed")} onRetry={reload} />;
  }
  if (shown.length === 0) return <>{empty}</>;

  return (
    <div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map((note) => {
          const thread = note.thread;
          const next = thread?.preview[0];
          const replace = (changed: Note) =>
            setItems((current) => current.map((c) => (c.id === changed.id ? changed : c)));
          return (
            <div key={note.id}>
              <div className={next ? "relative" : undefined}>
                {next && (
                  <span
                    aria-hidden
                    className="absolute -bottom-4 left-[17px] top-14 w-0.5 rounded-full bg-slate-200 dark:bg-slate-800"
                  />
                )}
                <NoteCard
                  note={note}
                  isNew={fresh.has(note.id)}
                  repostedBy={repostedBy ?? note.repostedBy?.username}
                  onQuoted={onQuoted}
                  showsPin={showsPin}
                  position={next && thread ? `1/${thread.total}` : undefined}
                  filteredBy={(() => {
                    const verdict = verdicts.get(note.id);
                    return verdict?.action === "warn" ? verdict.phrases : undefined;
                  })()}
                  onChange={(changed) => {
                    if (changed.pinned !== note.pinned) {
                      reload();
                      return;
                    }
                    replace({ ...changed, thread: changed.thread ?? note.thread });
                  }}
                  onDelete={(id) => setItems((current) => current.filter((c) => c.id !== id))}
                />
              </div>
              {next && thread && (
                <NoteCard
                  note={next}
                  onQuoted={onQuoted}
                  position={`2/${thread.total}`}
                  onChange={(changed) => replace({ ...note, thread: { ...thread, preview: [changed] } })}
                  onDelete={() => replace({ ...note, thread: null })}
                />
              )}
              {next && thread && thread.total > 2 && (
                <BlogLink
                  href={noteHref(note, locale)}
                  data-testid={`note-thread-more-${note.id}`}
                  className="focus-ring mb-3 ml-12 inline-block rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-400"
                >
                  {t("threadMore", { count: thread.total - 2 })}
                </BlogLink>
              )}
            </div>
          );
        })}
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

function NoteListSkeleton() {
  return (
    <div aria-busy="true" data-testid="note-list-skeleton" className="divide-y divide-slate-100 dark:divide-slate-800">
      <SrLoading />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-3 py-4">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
            <div className="h-3.5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
