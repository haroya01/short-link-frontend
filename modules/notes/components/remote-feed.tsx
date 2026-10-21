"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { useAuth } from "@/lib/auth";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteView, TrendingNote } from "@/modules/notes/api/remote-trending";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { useRemoteNotes } from "@/modules/notes/lib/use-remote-trending";
import { NoteCard } from "./note-card";
import { NoteListSkeleton } from "./note-list";
import { TrendingNoteCard, trendingDisplayNote } from "./remote-trending";

export function RemoteFeed({ view }: { view: RemoteView }) {
  return (
    <section data-testid="remote-feed" data-remote-view={view}>
      <RemoteNotesList view={view} />
    </section>
  );
}

const receivedHeading =
  "border-t border-slate-100 pt-5 text-[13px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400";

type Row =
  | { kind: "pool"; item: TrendingNote; filteredBy?: string[] }
  | { kind: "kept"; note: Note; filteredBy?: string[] };

export function RemoteNotesList({
  view,
  heading,
  fallback,
}: {
  view: RemoteView;
  heading?: ReactNode;
  fallback?: ReactNode;
}) {
  const quiet = fallback !== undefined;
  const t = useTranslations("notes");
  const tFeed = useTranslations("publicFeed");
  const notes = useRemoteNotes(view);
  const filters = useNoteFilters();
  const blocked = useBlockedNames();
  const { me, ready, authenticated } = useAuth();
  const sentinel = useRef<HTMLDivElement>(null);
  const loaded = notes.state === "ready" ? notes : null;
  const autoLoad = loaded !== null && loaded.hasMore && !loaded.moreFailed && !loaded.loadingMore;
  const more = loaded?.more;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !autoLoad || !more) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && more(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoad, more]);

  if (notes.state === "loading") return <NoteListSkeleton rows={3} />;
  if (notes.state === "failed") {
    if (quiet) return fallback;
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-4 text-[14px] text-slate-500 dark:text-slate-400">
        <span>{view === "latest" ? t("latestFailed") : t("trendingFailed")}</span>
        <button
          type="button"
          onClick={notes.retry}
          className="focus-ring rounded font-medium text-slate-900 hover:underline dark:text-slate-100"
        >
          {tFeed("retry")}
        </button>
      </p>
    );
  }

  const seenUris = new Set<string>();
  const seenIds = new Set<number>();
  const rows: Row[] = [];
  for (const page of notes.pages) {
    for (const entry of page.items) {
      if (entry.kind === "pool") {
        const { item } = entry;
        if (seenUris.has(item.uri)) continue;
        seenUris.add(item.uri);
        const verdict = noteVerdict(trendingDisplayNote(item), filters, "public", me?.id);
        if (verdict?.action === "hide") continue;
        rows.push({ kind: "pool", item, filteredBy: verdict?.action === "warn" ? verdict.phrases : undefined });
      } else {
        const { note } = entry;
        if (seenIds.has(note.id) || blocked.has(note.author.username)) continue;
        seenIds.add(note.id);
        const verdict = noteVerdict(note, filters, "public", me?.id);
        if (verdict?.action === "hide") continue;
        rows.push({ kind: "kept", note, filteredBy: verdict?.action === "warn" ? verdict.phrases : undefined });
      }
    }
  }
  const firstKept = view === "trending" && rows[0]?.kind === "pool" ? rows.findIndex((row) => row.kind === "kept") : -1;
  const signedOut = ready && !authenticated;
  const ended = !notes.hasMore;

  if (rows.length === 0 && ended) {
    if (quiet) return fallback;
    if (view === "trending" && signedOut) return <SignInEmptyState reason="federatedNotes" icon={Globe} />;
    return view === "latest" ? (
      <BlogEmpty title={t("latestEmpty")} />
    ) : (
      <BlogEmpty title={t("emptyFederated")} body={t("emptyFederatedBody")} />
    );
  }

  return (
    <div>
      {rows.length > 0 && heading}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, i) =>
          row.kind === "pool" ? (
            <div key={`pool-${row.item.uri}`} data-remote-uri={row.item.uri}>
              <TrendingNoteCard item={row.item} filteredBy={row.filteredBy} trending={view === "trending"} />
            </div>
          ) : (
            <div key={`kept-${row.note.id}`} data-remote-kept={row.note.id}>
              {i === firstKept && (
                <h2 className="pt-5 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t("receivedNotes")}</h2>
              )}
              <KeptNote note={row.note} filteredBy={row.filteredBy} />
            </div>
          ),
        )}
      </div>
      {notes.hasMore ? (
        <div ref={sentinel} role="status" aria-live="polite" className="mt-6 flex flex-col items-center gap-2 pb-6">
          <button
            type="button"
            onClick={notes.more}
            disabled={notes.loadingMore}
            className="focus-ring inline-flex items-center gap-2 rounded-surface border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
          >
            {notes.loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                {tFeed("loadingMore")}
              </>
            ) : notes.moreFailed ? (
              tFeed("retry")
            ) : (
              tFeed("loadMore")
            )}
          </button>
          {notes.moreFailed && !notes.loadingMore && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{tFeed("loadMoreError")}</p>
          )}
        </div>
      ) : (
        view === "trending" &&
        signedOut &&
        !quiet && (
          <>
            <h2 className={receivedHeading}>{t("receivedNotes")}</h2>
            <SignInEmptyState reason="federatedNotes" icon={Globe} />
          </>
        )
      )}
    </div>
  );
}

function KeptNote({ note, filteredBy }: { note: Note; filteredBy?: string[] }) {
  const [current, setCurrent] = useState(note);
  const [removed, setRemoved] = useState(false);
  if (removed) return null;
  return (
    <NoteCard
      note={current}
      filteredBy={filteredBy}
      onChange={(changed) => setCurrent({ ...changed, thread: changed.thread ?? current.thread })}
      onDelete={() => setRemoved(true)}
    />
  );
}
