"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { useAuth } from "@/lib/auth";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteNotesPage, RemoteView, SeenFeed } from "@/modules/notes/api/remote-trending";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { remoteRows, type RemoteRow } from "@/modules/notes/lib/remote-rows";
import { seenQueue, watchSeen } from "@/modules/notes/lib/remote-seen";
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
const rowHeading = "pt-5 text-[13px] font-semibold text-slate-500 dark:text-slate-400";
const FAILED = { "for-you": "forYouFailed", latest: "latestFailed", trending: "trendingFailed" } as const;

export function useRemoteRows(): (pages: RemoteNotesPage[]) => RemoteRow[] {
  const filters = useNoteFilters();
  const blocked = useBlockedNames();
  const { me } = useAuth();
  return (pages) =>
    remoteRows(
      pages,
      (entry) =>
        noteVerdict(entry.kind === "pool" ? trendingDisplayNote(entry.item) : entry.note, filters, "public", me?.id),
      blocked,
    );
}

function RemoteNotesList({ view }: { view: RemoteView }) {
  const t = useTranslations("notes");
  const tFeed = useTranslations("publicFeed");
  const notes = useRemoteNotes(view);
  const rowsOf = useRemoteRows();
  const { ready, authenticated } = useAuth();
  const sentinel = useRef<HTMLDivElement>(null);
  const loaded = notes.state === "ready" ? notes : null;
  const autoLoad = loaded !== null && loaded.hasMore && !loaded.moreFailed && !loaded.loadingMore;
  const stalled = loaded?.stalled === true;
  const more = loaded?.more;
  const feed = view === "trending" ? null : view;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !autoLoad || stalled || !more) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && more(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoad, stalled, more]);

  useEffect(() => {
    if (!autoLoad || !stalled || !more) return;
    const onScroll = () => more();
    window.addEventListener("scroll", onScroll, { once: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoLoad, stalled, more]);

  useEffect(() => {
    if (!feed) return;
    return () => void seenQueue().flush();
  }, [feed]);

  if (notes.state === "loading") return <NoteListSkeleton rows={3} />;
  if (notes.state === "failed") {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-4 text-[14px] text-slate-500 dark:text-slate-400">
        <span>{t(FAILED[view])}</span>
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

  const rows = rowsOf(notes.pages);
  const firstKept = view === "trending" && rows[0]?.kind === "pool" ? rows.findIndex((row) => row.kind === "kept") : -1;
  const signedOut = ready && !authenticated;
  const ended = !notes.hasMore;

  if (rows.length === 0 && ended) {
    if (view === "trending" && signedOut) return <SignInEmptyState reason="federatedNotes" icon={Globe} />;
    return view !== "trending" ? (
      <BlogEmpty title={t("latestEmpty")} />
    ) : (
      <BlogEmpty title={t("emptyFederated")} body={t("emptyFederatedBody")} />
    );
  }

  return (
    <div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, i) => (
          <RemoteRowView
            key={remoteRowKey(row)}
            row={row}
            feed={feed}
            trending={view === "trending"}
            above={
              <>
                {row.seenStart && <SeenDivider />}
                {i === firstKept && <h2 className={rowHeading}>{t("receivedNotes")}</h2>}
              </>
            }
          />
        ))}
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
        signedOut && (
          <>
            <h2 className={receivedHeading}>{t("receivedNotes")}</h2>
            <SignInEmptyState reason="federatedNotes" icon={Globe} />
          </>
        )
      )}
    </div>
  );
}

export function remoteRowKey(row: RemoteRow): string {
  return row.kind === "pool" ? `pool-${row.uri}` : `kept-${row.note.id}`;
}

export function SeenDivider() {
  const t = useTranslations("notes");
  return <h2 className={rowHeading}>{t("remoteSeenDivider")}</h2>;
}

function RemoteMark() {
  const t = useTranslations("notes");
  return (
    <p
      data-remote-mark
      className="-mt-1 mb-1.5 flex items-center gap-3 text-[13px] font-medium text-slate-500 dark:text-slate-400"
    >
      <span aria-hidden className="w-9 shrink-0" />
      <span className="truncate">{t("feedFederated")}</span>
    </p>
  );
}

export function RemoteRowView({
  row,
  feed,
  above,
  trending = false,
  marked = false,
  glance = false,
}: {
  row: RemoteRow;
  feed: SeenFeed | null;
  above?: ReactNode;
  trending?: boolean;
  marked?: boolean;
  glance?: boolean;
}) {
  const mark = marked ? <RemoteMark /> : undefined;
  return row.kind === "pool" ? (
    <SeenWatch uri={row.uri} feed={feed} glance={glance} data-remote-uri={row.uri}>
      {above}
      <TrendingNoteCard item={row.item} filteredBy={row.filteredBy} trending={trending} context={mark} />
    </SeenWatch>
  ) : (
    <SeenWatch uri={row.uri} feed={feed} glance={glance} data-remote-kept={row.note.id}>
      {above}
      <KeptNote note={row.note} filteredBy={row.filteredBy} context={mark} />
    </SeenWatch>
  );
}

export function SeenWatch({
  uri,
  feed,
  glance = false,
  children,
  ...data
}: {
  uri: string | null;
  feed: SeenFeed | null;
  glance?: boolean;
  children: ReactNode;
  "data-remote-uri"?: string;
  "data-remote-kept"?: number;
  "data-home-seen"?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !uri || !feed) return;
    return watchSeen(el, uri, feed, glance);
  }, [uri, feed, glance]);
  return (
    <div ref={box} {...data}>
      {children}
    </div>
  );
}

function KeptNote({ note, filteredBy, context }: { note: Note; filteredBy?: string[]; context?: ReactNode }) {
  const [current, setCurrent] = useState(note);
  const [removed, setRemoved] = useState(false);
  if (removed) return null;
  return (
    <NoteCard
      note={current}
      filteredBy={filteredBy}
      context={context}
      onChange={(changed) => setCurrent({ ...changed, thread: changed.thread ?? current.thread })}
      onDelete={() => setRemoved(true)}
    />
  );
}
