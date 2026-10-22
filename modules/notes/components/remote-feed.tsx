"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteView, SeenFeed } from "@/modules/notes/api/remote-trending";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { remoteRows } from "@/modules/notes/lib/remote-rows";
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

export type RemoteOrder = SeenFeed;

function orderOf(value: string | null): RemoteOrder {
  return value === "latest" ? "latest" : "for-you";
}

export function useRemoteOrder(): [RemoteOrder, (order: RemoteOrder) => void, boolean] {
  const params = useSearchParams();
  const [order, setOrder] = useState<RemoteOrder>(() => orderOf(params.get("order")));
  const [picked, setPicked] = useState(false);
  function pick(next: RemoteOrder) {
    if (next === order) return;
    setOrder(next);
    setPicked(true);
    const url = new URL(window.location.href);
    if (next === "for-you") url.searchParams.delete("order");
    else url.searchParams.set("order", next);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  return [order, pick, picked];
}

export function RemoteOrderSwitch({ order, onOrder }: { order: RemoteOrder; onOrder: (order: RemoteOrder) => void }) {
  const t = useTranslations("notes");
  const label: Record<RemoteOrder, string> = { "for-you": t("orderForYou"), latest: t("orderLatest") };
  return (
    <div role="group" aria-label={t("orderLabel")} className="-mx-1.5 flex gap-1 text-[13px] font-semibold">
      {(["for-you", "latest"] as const).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={order === key}
          data-remote-order={key}
          onClick={() => onOrder(key)}
          className={cn(
            "focus-ring touch-target rounded px-1.5 py-1 transition-colors",
            order === key
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {label[key]}
        </button>
      ))}
    </div>
  );
}

export function RemoteOrderedFeed() {
  const [order, pick] = useRemoteOrder();
  return (
    <section data-testid="remote-feed" data-remote-view={order}>
      <div className="pt-3">
        <RemoteOrderSwitch order={order} onOrder={pick} />
      </div>
      <RemoteNotesList key={order} view={order} />
    </section>
  );
}

const receivedHeading =
  "border-t border-slate-100 pt-5 text-[13px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400";
const rowHeading = "pt-5 text-[13px] font-semibold text-slate-500 dark:text-slate-400";
const FAILED = { "for-you": "forYouFailed", latest: "latestFailed", trending: "trendingFailed" } as const;

export function RemoteNotesList({
  view,
  heading,
  fallback,
  headingWhileLoading = false,
}: {
  view: RemoteView;
  heading?: ReactNode;
  fallback?: ReactNode;
  headingWhileLoading?: boolean;
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
    return () => seenQueue().flush();
  }, [feed]);

  if (notes.state === "loading") {
    return (
      <>
        {headingWhileLoading && heading}
        <NoteListSkeleton rows={3} />
      </>
    );
  }
  if (notes.state === "failed") {
    if (quiet) return fallback;
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

  const rows = remoteRows(
    notes.pages,
    (entry) =>
      noteVerdict(entry.kind === "pool" ? trendingDisplayNote(entry.item) : entry.note, filters, "public", me?.id),
    blocked,
  );
  const firstKept = view === "trending" && rows[0]?.kind === "pool" ? rows.findIndex((row) => row.kind === "kept") : -1;
  const signedOut = ready && !authenticated;
  const ended = !notes.hasMore;
  const SeenHeading = heading ? "h3" : "h2";

  if (rows.length === 0 && ended) {
    if (quiet) return fallback;
    if (view === "trending" && signedOut) return <SignInEmptyState reason="federatedNotes" icon={Globe} />;
    return view !== "trending" ? (
      <BlogEmpty title={t("latestEmpty")} />
    ) : (
      <BlogEmpty title={t("emptyFederated")} body={t("emptyFederatedBody")} />
    );
  }

  return (
    <div>
      {rows.length > 0 && heading}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, i) => {
          const divider = row.seenStart && <SeenHeading className={rowHeading}>{t("remoteSeenDivider")}</SeenHeading>;
          return row.kind === "pool" ? (
            <SeenWatch key={`pool-${row.uri}`} uri={row.uri} feed={feed} data-remote-uri={row.uri}>
              {divider}
              <TrendingNoteCard item={row.item} filteredBy={row.filteredBy} trending={view === "trending"} />
            </SeenWatch>
          ) : (
            <SeenWatch key={`kept-${row.note.id}`} uri={row.uri} feed={feed} data-remote-kept={row.note.id}>
              {divider}
              {i === firstKept && <h2 className={rowHeading}>{t("receivedNotes")}</h2>}
              <KeptNote note={row.note} filteredBy={row.filteredBy} />
            </SeenWatch>
          );
        })}
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

function SeenWatch({
  uri,
  feed,
  children,
  ...data
}: {
  uri: string | null;
  feed: SeenFeed | null;
  children: ReactNode;
  "data-remote-uri"?: string;
  "data-remote-kept"?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !uri || !feed) return;
    return watchSeen(el, uri, feed);
  }, [uri, feed]);
  return (
    <div ref={box} {...data}>
      {children}
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
