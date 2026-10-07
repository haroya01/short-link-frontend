"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/common/empty-state";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { FeedSortTabs, type FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
import {
  getNoteFeedPreferences,
  listBookmarkedNotes,
  listDirectNotes,
  listEveryoneNotes,
  listFollowingNotes,
  listTrendingNotes,
  setShowReposts,
  type Note,
  type NoteFeed,
  type QuotedPost,
} from "@/modules/notes/api/notes";
import { NoteComposer, NoteSignInRow } from "./note-composer";
import { NoteList } from "./note-list";
import { NoteListsPanel } from "./note-lists";

const FEEDS = ["everyone", "following", "trending", "bookmarks", "direct", "lists"] as const;
type Feed = (typeof FEEDS)[number];

const LOADERS: Record<Exclude<Feed, "lists">, (page: number) => Promise<NoteFeed>> = {
  everyone: listEveryoneNotes,
  following: listFollowingNotes,
  trending: listTrendingNotes,
  bookmarks: listBookmarkedNotes,
  direct: listDirectNotes,
};

const PERSONAL: ReadonlySet<Feed> = new Set(["following", "bookmarks", "direct", "lists"]);

function feedOf(value: string | null): Feed {
  return FEEDS.find((feed) => feed === value) ?? "everyone";
}

function quoteFromParams(params: URLSearchParams): QuotedPost | null {
  const id = Number(params.get("quote"));
  const title = params.get("quoteTitle");
  const slug = params.get("quoteSlug");
  const authorUsername = params.get("quoteAuthor");
  if (!Number.isInteger(id) || id <= 0 || !title || !slug || !authorUsername) return null;
  return { id, title, slug, authorUsername };
}

export function NotesFeed() {
  const t = useTranslations("notes");
  const params = useSearchParams();
  const pathname = usePathname();
  const { ready, authenticated, signInWithGoogle } = useAuth();
  const [quote, setQuote] = useState<QuotedPost | null>(() => quoteFromParams(params));
  const [posted, setPosted] = useState<Note[]>([]);
  const feed = feedOf(params.get("feed"));
  const load = useCallback(
    (page: number) => (feed === "lists" ? Promise.resolve({ items: [], page, hasNext: false }) : LOADERS[feed](page)),
    [feed],
  );
  const listId = Number(params.get("list")) || null;
  const label: Record<Feed, string> = {
    everyone: t("feedEveryone"),
    following: t("feedFollowing"),
    trending: t("feedTrending"),
    bookmarks: t("feedBookmarks"),
    direct: t("feedDirect"),
    lists: t("feedLists"),
  };
  const tabs: FeedSortTab[] = FEEDS.map((key) => ({
    key,
    label: label[key],
    href: key === "everyone" ? pathname : `${pathname}?feed=${key}`,
    active: key === feed,
    personal: PERSONAL.has(key),
  }));
  const empty: Record<Feed, string> = {
    everyone: t("emptyAuthor"),
    following: t("emptyFollowing"),
    trending: t("emptyTrending"),
    bookmarks: t("emptyBookmarks"),
    direct: t("emptyDirect"),
    lists: t("listEmpty"),
  };
  const signedOut = ready && !authenticated;
  const showsPosted = feed === "everyone" || feed === "following";
  const reposts = useShowReposts(feed === "following" && ready && authenticated);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <FeedSortTabs tabs={tabs} />
        {reposts.shown !== null && (
          <label className="flex shrink-0 items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
            {t("showReposts")}
            <Switch
              checked={reposts.shown}
              onCheckedChange={reposts.set}
              aria-label={t("showReposts")}
            />
          </label>
        )}
      </div>
      <div className="border-b border-slate-100 dark:border-slate-800">
        {ready && authenticated ? (
          <NoteComposer
            quote={quote}
            onClearQuote={() => setQuote(null)}
            onCreated={(note) => setPosted((current) => [note, ...current])}
          />
        ) : (
          <NoteSignInRow label={t("loginToWrite")} placeholder={t("composerPlaceholder")} />
        )}
      </div>
      {PERSONAL.has(feed) && signedOut ? (
        <EmptyState
          title={
            feed === "following"
              ? t("signInForFollowing")
              : feed === "direct"
                ? t("signInForDirect")
                : feed === "lists"
                  ? t("signInForLists")
                  : t("signInForBookmarks")
          }
          className="mt-8"
          action={
            <button
              type="button"
              onClick={signInWithGoogle}
              className="focus-ring rounded-full bg-accent-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-800"
            >
              {t("signIn")}
            </button>
          }
        />
      ) : feed === "lists" ? (
        <NoteListsPanel selectedId={listId} />
      ) : (
        <NoteList
          key={`${feed}:${reposts.version}`}
          load={load}
          prepend={showsPosted ? posted : []}
          onQuoted={(note) => setPosted((current) => [note, ...current])}
          empty={<EmptyState title={empty[feed]} className="mt-8" />}
          filterContext={feed === "following" ? "home" : feed === "everyone" || feed === "trending" ? "public" : undefined}
        />
      )}
    </div>
  );
}

function useShowReposts(active: boolean) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [shown, setShown] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!active || shown !== null) return;
    let live = true;
    getNoteFeedPreferences()
      .then((preferences) => live && setShown(preferences.showReposts))
      .catch(() => live && setShown(true));
    return () => {
      live = false;
    };
  }, [active, shown]);

  async function set(next: boolean) {
    const before = shown;
    setShown(next);
    try {
      setShown((await setShowReposts(next)).showReposts);
      setVersion((v) => v + 1);
    } catch {
      setShown(before);
      toast(t("settingFailed"), "error");
    }
  }

  return { shown: active ? shown : null, version, set };
}
