"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { SignInRow } from "@/components/auth/sign-in-row";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { listHome, listHomeSince, type HomeItem, type HomePage, type HomePost, type HomeTab } from "@/modules/blog/api/home-feed";
import { mixHome, pullNotice, remoteBesides, type Mixed } from "@/modules/blog/lib/home-mix";
import { onHomeRefresh } from "@/modules/blog/lib/home-refresh";
import { fetchPublicConnectionFeed, type ConnectionEvent } from "@/modules/blog/api/collections";
import type { SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { ConnectionFeedInsert } from "@/modules/blog/components/connection-feed-insert";
import { useViewerList } from "@/modules/blog/lib/use-viewer-list";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { blogCta } from "@/modules/blog/components/blog-cta";
import type { FeedMoreItem } from "@/modules/blog/components/feed-more-menu";
import { FeedContentTransition } from "@/modules/blog/components/feed-content-transition";
import { FeedSwitcher } from "@/modules/blog/components/feed-switcher";
import { FollowingFeed } from "@/modules/blog/components/following-feed";
import { HomePostRow } from "@/modules/blog/components/home-post-row";
import { BelongingProvider } from "@/modules/blog/components/post-belonging-context";
import { onNotePosted, takeArrivingNote } from "@/modules/blog/lib/consequence-events";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import type { Note, QuotedPost } from "@/modules/notes/api/notes";
import { NoteComposer } from "@/modules/notes/components/note-composer";
import { NoteDraftsButton } from "@/modules/notes/components/note-drafts-sheet";
import { NoteFeedRow, NoteListSkeleton } from "@/modules/notes/components/note-list";
import { RemoteRowView, SeenDivider, SeenWatch, remoteRowKey, useRemoteRows } from "@/modules/notes/components/remote-feed";
import type { RemoteRow } from "@/modules/notes/lib/remote-rows";
import { seenKeyOf, seenQueue } from "@/modules/notes/lib/remote-seen";
import { remoteNotesKey, useRemoteNotes } from "@/modules/notes/lib/use-remote-trending";
import { listRemoteNotes, type RemoteNotesPage } from "@/modules/notes/api/remote-trending";
import { useToast } from "@/components/ui/toast";
import type { NoteDraft } from "@/modules/notes/lib/note-drafts";
import { noteVerdict, useNoteFilters } from "@/modules/notes/lib/note-filters";
import { useShowReposts } from "@/modules/notes/lib/use-show-reposts";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export type HomeSort = "following" | "recent" | "trending";

const SORTS: readonly HomeSort[] = ["following", "recent", "trending"];

const API_TAB: Record<HomeSort, HomeTab> = { following: "following", recent: "latest", trending: "trending" };

function quoteFromParams(params: URLSearchParams): QuotedPost | null {
  const id = Number(params.get("quote"));
  const title = params.get("quoteTitle");
  const slug = params.get("quoteSlug");
  const authorUsername = params.get("quoteAuthor");
  if (!Number.isInteger(id) || id <= 0 || !title || !slug || !authorUsername) return null;
  return { id, title, slug, authorUsername };
}

export function HomeFeed({
  locale,
  sort,
  initial = null,
  suggestedAuthors = [],
  connectionEvents,
  aboveList,
}: {
  locale: string;
  sort: HomeSort;
  initial?: HomePage | null;
  suggestedAuthors?: SuggestedAuthor[];
  connectionEvents?: ConnectionEvent[];
  aboveList?: ReactNode;
}) {
  const t = useTranslations("publicFeed");
  const tNotes = useTranslations("notes");
  const { ready, authenticated } = useAuth();
  const [quote, setQuote] = useState<QuotedPost | null>(null);
  const [posted, setPosted] = useState<Note[]>([]);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const reposts = useShowReposts(sort === "following" && ready && authenticated);
  const signedOut = ready && !authenticated;

  const showsPosted = sort !== "trending";
  const arrive = useCallback((note: Note) => {
    setPosted((current) => [note, ...current.filter((n) => n.id !== note.id)]);
    const reduce = prefersReducedMotion();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, []);
  useEffect(() => {
    if (!showsPosted) return;
    const held = takeArrivingNote();
    if (held) arrive(held);
    return onNotePosted((note) => {
      arrive(note);
      return true;
    });
  }, [showsPosted, arrive]);
  useEffect(() => setQuote(quoteFromParams(new URLSearchParams(window.location.search))), []);

  const pickDraft = (next: NoteDraft) => {
    setQuote(next.quote && "post" in next.quote ? next.quote.post : null);
    setDraft(next);
  };

  const tabs = [
    { key: "following", label: t("feed"), href: "?sort=following", active: sort === "following" },
    { key: "recent", label: t("recent"), href: "?sort=recent", active: sort === "recent" },
    { key: "trending", label: t("trending"), href: "?sort=trending", active: sort === "trending" },
  ];
  const more: FeedMoreItem[] = [
    { key: "for-you", label: t("forYou"), icon: "binoculars", href: "?sort=for-you", active: false },
    { key: "series", label: t("seriesTab"), icon: "series", href: "?sort=series", active: false },
  ];

  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <FeedSwitcher
          surface="blog"
          tabs={tabs}
          more={more}
          toggles={
            reposts.shown === null
              ? undefined
              : [{ key: "reposts", label: tNotes("showReposts"), checked: reposts.shown, onChange: reposts.set }]
          }
        />
        <div className="border-b border-slate-100 dark:border-slate-800">
          {!ready ? (
            <div aria-hidden className="h-[60px]" />
          ) : authenticated ? (
            <NoteComposer
              key={draft?.id ?? "home"}
              draft={draft}
              quote={quote}
              quotedNote={draft?.quote && "note" in draft.quote ? draft.quote.note : null}
              onClearQuote={() => setQuote(null)}
              onCreated={(note) => {
                setPosted((current) => [note, ...current]);
                setDraft(null);
              }}
              draftsButton={(currentId, hidden) => (
                <NoteDraftsButton
                  onPick={pickDraft}
                  currentId={currentId}
                  hidden={hidden}
                  className="shrink-0 self-center whitespace-nowrap"
                />
              )}
            />
          ) : (
            <SignInRow reason="note" placeholder={tNotes("composerPlaceholder")} />
          )}
        </div>
        <FeedContentTransition index={SORTS.indexOf(sort)} contentKey={sort}>
          {aboveList && <div className="mt-4">{aboveList}</div>}
          {sort === "following" && signedOut ? (
            <FollowingFeed locale={locale} suggestedAuthors={suggestedAuthors} />
          ) : (
            <HomeList
              key={sort}
              refresh={reposts.version}
              onQuoted={(note) => setPosted((current) => [note, ...current])}
              locale={locale}
              connectionEvents={sort === "following" ? undefined : connectionEvents}
              sort={sort}
              initial={sort === "recent" ? initial : null}
              posted={sort === "trending" ? [] : posted}
            />
          )}
        </FeedContentTransition>
      </div>
    </div>
  );
}

type Row = { kind: "note"; note: Note; filteredBy?: string[] } | { kind: "post"; post: HomePost };
type Entry =
  | { kind: "local"; row: Row; card?: ConnectionEvent }
  | { kind: "remote"; row: RemoteRow; divider: boolean };

const CONNECTION_FIRST = 5;
const CONNECTION_EVERY = 5;

function HomeList({
  locale,
  sort,
  refresh,
  initial,
  posted,
  onQuoted,
  connectionEvents: serverConnectionEvents,
}: {
  locale: string;
  refresh: number;
  onQuoted: (note: Note) => void;
  sort: HomeSort;
  initial: HomePage | null;
  posted: Note[];
  connectionEvents?: ConnectionEvent[];
}) {
  const t = useTranslations("publicFeed");
  const tNav = useTranslations("nav");
  const { ready, authenticated, me } = useAuth();
  const filters = useNoteFilters();
  const blocked = useBlockedNames();
  const anonymous = !ready || !authenticated;
  const [changed, setChanged] = useState<Map<number, Note>>(new Map());
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const sentinel = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [arrived, setArrived] = useState<HomeItem[]>([]);
  const newest = useRef<string | null>(null);
  const shownKeys = useRef<ReadonlySet<string>>(new Set());
  const [pulled, setPulled] = useState<{ before: ReadonlySet<string>; failed: { own: boolean; remote: boolean } } | null>(
    null,
  );
  const { toast } = useToast();
  const refreshing = useRef(false);
  const connectionEvents = useViewerList(
    serverConnectionEvents ?? [],
    () =>
      serverConnectionEvents
        ? fetchPublicConnectionFeed(0, serverConnectionEvents.length || 6).then((r) => (r.ok ? r.data.items : null))
        : Promise.resolve(null),
    "connections",
  );
  const mixing = sort === "recent";
  const hiding = mixing && ready;
  const { data, isError, refetch, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["home", sort, anonymous ? "anonymous" : "member", refresh, hiding ? "hide" : "all"],
      queryFn: async ({ pageParam }) => {
        const result = await listHome(API_TAB[sort], pageParam, undefined, hiding);
        if (!result.ok) throw new Error(String(result.status));
        return result.data;
      },
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.next,
      initialData: anonymous && !hiding && initial && refresh === 0 ? { pages: [initial], pageParams: [null] } : undefined,
      placeholderData: keepPreviousData,
      enabled: ready,
      staleTime: 30_000,
    });
  const forYou = useRemoteNotes("for-you", mixing, hiding);
  const remoteRowsOf = useRemoteRows();
  const autoLoad = Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError;
  const queryKey = useRef<unknown[]>([]);
  queryKey.current = ["home", sort, anonymous ? "anonymous" : "member", refresh, hiding ? "hide" : "all"];

  const firstPage = data?.pages[0];
  useEffect(() => {
    if (firstPage?.newest && newest.current === null) newest.current = firstPage.newest;
  }, [firstPage]);

  const reloadUnseen = useCallback(
    async (quiet: boolean) => {
      await seenQueue().flush();
      const [found, remote] = await Promise.all([
        listHome(API_TAB[sort], null, undefined, true),
        listRemoteNotes("for-you", null, undefined, true).catch(() => null),
      ]);
      const before = shownKeys.current;
      if (found.ok) {
        setArrived([]);
        newest.current = found.data.newest ?? null;
        queryClient.setQueryData<InfiniteData<HomePage, string | null>>(queryKey.current, {
          pages: [found.data],
          pageParams: [null],
        });
      }
      if (remote) {
        queryClient.setQueryData<InfiniteData<RemoteNotesPage, string | null>>(remoteNotesKey("for-you", authenticated, true), {
          pages: [remote],
          pageParams: [null],
        });
      }
      if (!quiet) setPulled({ before, failed: { own: !found.ok, remote: remote === null } });
    },
    [sort, authenticated, queryClient],
  );

  const refreshNow = useCallback(async () => {
    if (refreshing.current) return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    if (sort === "trending") {
      setArrived([]);
      newest.current = null;
      await refetch();
      return;
    }
    refreshing.current = true;
    try {
      if (hiding) {
        await reloadUnseen(false);
        return;
      }
      if (newest.current === null) {
        setArrived([]);
        await refetch();
        return;
      }
      const result = await listHomeSince(API_TAB[sort], newest.current);
      if (!result.ok) return;
      const page = result.data;
      if (page.newest) newest.current = page.newest;
      if (page.gap) {
        setArrived([]);
        queryClient.setQueryData<InfiniteData<HomePage, string | null>>(queryKey.current, {
          pages: [page],
          pageParams: [null],
        });
      } else if (page.items.length > 0) {
        setArrived((current) => [...page.items, ...current]);
      }
    } finally {
      refreshing.current = false;
    }
  }, [sort, hiding, refetch, queryClient, reloadUnseen]);

  const reloadAll = useCallback(async () => {
    if (!hiding) {
      void refreshNow();
      return;
    }
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      await reloadUnseen(true);
    } finally {
      refreshing.current = false;
    }
  }, [hiding, refreshNow, reloadUnseen]);

  useEffect(
    () => onHomeRefresh(() => void refreshNow(), () => void reloadAll(), hiding ? () => {} : () => void refreshNow()),
    [refreshNow, reloadAll, hiding],
  );

  const top: Row[] = [];
  const main: Row[] = [];
  const localNotes = new Set<number>();
  if (data) {
    const seenPosts = new Set<number>();
    const context = sort === "following" ? "home" : "public";
    const addNote = (raw: Note, into: Row[]) => {
      if (localNotes.has(raw.id) || removed.has(raw.id)) return;
      localNotes.add(raw.id);
      const note = changed.get(raw.id) ?? raw;
      if (blocked.has(note.author.username)) return;
      const verdict = noteVerdict(note, filters, context, me?.id);
      if (verdict?.action === "hide") return;
      into.push({ kind: "note", note, filteredBy: verdict?.action === "warn" ? verdict.phrases : undefined });
    };
    const addItem = (item: HomeItem, into: Row[]) => {
      if (item.kind === "note") addNote(item.note, into);
      else if (!seenPosts.has(item.post.id) && !blocked.has(item.post.author.username)) {
        seenPosts.add(item.post.id);
        into.push(item);
      }
    };
    posted.forEach((note) => addNote(note, top));
    arrived.forEach((item) => addItem(item, top));
    data.pages.forEach((page) => page.items.forEach((item) => addItem(item, main)));
  }
  const remote = forYou.state === "ready" ? forYou : null;
  const remoteRows = remote ? remoteBesides(remoteRowsOf(remote.pages), localNotes) : [];
  const localDone = data !== undefined && !hasNextPage;
  const connectAfter = new Map<number, ConnectionEvent>();
  connectionEvents.forEach((event, k) => {
    const at = CONNECTION_FIRST + k * CONNECTION_EVERY;
    if (at < main.length) connectAfter.set(at, event);
  });
  const cards = new Set(connectAfter.keys());
  const mixed = mixing ? mixHome(main, remoteRows, localDone, cards) : { rows: main.map(asLocal), wanted: 0 };
  const entries: Entry[] = [...top.map((row): Entry => ({ kind: "local", row })), ...mainEntries(mixed.rows, connectAfter)];
  const laidKeys = entries.map((entry) => (entry.kind === "remote" ? remoteRowKey(entry.row) : rowKey(entry.row)));
  shownKeys.current = new Set(laidKeys);
  const notice = pulled ? pullNotice(pulled.before, laidKeys, pulled.failed) : null;
  const remoteMore =
    remote !== null && remote.hasMore && !remote.loadingMore && !remote.moreFailed && !remote.stalled ? remote.more : null;
  const remoteShort =
    remoteMore !== null && (mixed.wanted > remoteRows.length || (localDone && entries.length === 0));
  const pager = hasNextPage
    ? { more: () => void fetchNextPage(), loading: isFetchingNextPage, failed: isFetchNextPageError, auto: autoLoad }
    : mixing && localDone && remote?.hasMore
      ? { more: remote.more, loading: remote.loadingMore, failed: remote.moreFailed, auto: remoteMore !== null }
      : null;
  const autoMore = useRef<(() => void) | null>(null);
  autoMore.current = pager?.auto ? pager.more : null;
  const autoFrom = pager?.auto ? (hasNextPage ? "home" : "remote") : null;

  useEffect(() => {
    if (!notice) return;
    setPulled(null);
    if (notice === "nothingNew") toast(t("homeNothingNew"));
    else if (notice === "failed") toast(t("homeRefreshFailed"), "error");
  }, [notice, toast, t]);

  useEffect(() => {
    if (remoteShort) remoteMore?.();
  }, [remoteShort, remoteMore]);

  useEffect(() => {
    if (!mixing) return;
    return () => void seenQueue().flush();
  }, [mixing]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !autoFrom) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && autoMore.current?.(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [autoFrom]);

  if (!data) {
    return isError ? <ErrorState onRetry={() => void refetch()} /> : <NoteListSkeleton />;
  }

  const fresh = new Set([...posted.map((n) => n.id), ...arrived.flatMap((item) => (item.kind === "note" ? [item.note.id] : []))]);
  const freshPosts = new Set(arrived.flatMap((item) => (item.kind === "post" ? [item.post.id] : [])));

  const caughtUp = (
    <div data-testid="home-caught-up">
      <BlogEmpty
        title={t("homeCaughtUp")}
        action={
          <BlogLink href={blogHref("/?sort=following")} className={blogCta({ variant: "text" })}>
            {t("feed")}
          </BlogLink>
        }
      />
    </div>
  );

  if (entries.length === 0 && !hasNextPage) {
    if (mixing && (forYou.state === "loading" || remoteMore !== null)) return <NoteListSkeleton />;
    if (hiding) return caughtUp;
    return sort === "following" ? (
      <BlogEmpty
        title={t("homeEmptyFollowing")}
        action={
          <BlogLink href={blogHref("/explore")} className={blogCta({ variant: "text" })}>
            {tNav("explore")}
          </BlogLink>
        }
      />
    ) : (
      <BlogEmpty title={t("emptyTitle")} />
    );
  }


  return (
    <div data-testid="home-feed">
      <BelongingProvider>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map((entry) => {
          if (entry.kind === "remote") {
            return (
              <RemoteRowView
                key={remoteRowKey(entry.row)}
                row={entry.row}
                feed="for-you"
                marked
                glance={hiding}
                above={entry.divider && <SeenDivider />}
              />
            );
          }
          const row = entry.row;
          const shownRow =
            row.kind === "note" ? (
              <NoteFeedRow
                note={row.note}
                isNew={fresh.has(row.note.id)}
                repostedBy={row.note.repostedBy?.username}
                onQuoted={onQuoted}
                filteredBy={row.filteredBy}
                onReplace={(next) => setChanged((current) => new Map(current).set(next.id, next))}
                onRemove={(id) => setRemoved((current) => new Set(current).add(id))}
              />
            ) : freshPosts.has(row.post.id) ? (
              <div className="note-arrive">
                <HomePostRow post={row.post} />
              </div>
            ) : (
              <HomePostRow post={row.post} />
            );
          const key = seenKeyOf(row.kind === "note" ? { kind: "note", id: row.note.id } : { kind: "post", id: row.post.id });
          return (
            <Fragment key={row.kind === "note" ? `note-${row.note.id}` : `post-${row.post.id}`}>
              {mixing ? (
                <SeenWatch uri={hiding ? key : null} feed="for-you" glance data-home-seen={hiding ? key : undefined}>
                  {shownRow}
                </SeenWatch>
              ) : (
                shownRow
              )}
              {entry.card && (
                <ul data-testid="home-connection">
                  <ConnectionFeedInsert event={entry.card} locale={locale} />
                </ul>
              )}
            </Fragment>
          );
        })}
      </div>
      </BelongingProvider>
      {hiding && localDone && !pager && forYou.state !== "loading" && caughtUp}
      {pager && (
        <div ref={sentinel} role="status" aria-live="polite" className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={pager.more}
            disabled={pager.loading}
            className="focus-ring inline-flex items-center gap-2 rounded-surface border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
          >
            {pager.loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                {t("loadingMore")}
              </>
            ) : pager.failed ? (
              t("retry")
            ) : (
              t("loadMore")
            )}
          </button>
          {pager.failed && !pager.loading && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("loadMoreError")}</p>
          )}
        </div>
      )}
    </div>
  );
}

const REMOTE_FOR_YOU_KEY = ["notes", "remote", "for-you"];

function mainEntries(rows: Mixed<Row, RemoteRow>[], cards: Map<number, ConnectionEvent>): Entry[] {
  let mine = -1;
  return rows.map((entry) => {
    if (entry.kind === "remote") {
      return { kind: "remote", row: entry.item, divider: entry.tail && entry.item.seenStart === true };
    }
    mine += 1;
    return { kind: "local", row: entry.item, card: cards.get(mine) };
  });
}

function rowKey(row: Row): string {
  return row.kind === "note" ? `note-${row.note.id}` : `post-${row.post.id}`;
}

function asLocal(item: Row): Mixed<Row, RemoteRow> {
  return { kind: "local", item };
}
