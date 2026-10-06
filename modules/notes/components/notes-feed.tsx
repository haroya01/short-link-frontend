"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/common/empty-state";
import { FeedSortTabs, type FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
import {
  listBookmarkedNotes,
  listEveryoneNotes,
  listFollowingNotes,
  listTrendingNotes,
  type Note,
  type NoteFeed,
  type QuotedPost,
} from "@/modules/notes/api/notes";
import { NoteComposer, NoteSignInRow } from "./note-composer";
import { NoteList } from "./note-list";

const FEEDS = ["everyone", "following", "trending", "bookmarks"] as const;
type Feed = (typeof FEEDS)[number];

const LOADERS: Record<Feed, (page: number) => Promise<NoteFeed>> = {
  everyone: listEveryoneNotes,
  following: listFollowingNotes,
  trending: listTrendingNotes,
  bookmarks: listBookmarkedNotes,
};

const PERSONAL: ReadonlySet<Feed> = new Set(["following", "bookmarks"]);

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
  const load = useCallback((page: number) => LOADERS[feed](page), [feed]);
  const label: Record<Feed, string> = {
    everyone: t("feedEveryone"),
    following: t("feedFollowing"),
    trending: t("feedTrending"),
    bookmarks: t("feedBookmarks"),
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
  };
  const signedOut = ready && !authenticated;
  const showsPosted = feed === "everyone" || feed === "following";

  return (
    <div>
      <div className="mb-2 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <FeedSortTabs tabs={tabs} />
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
          title={feed === "following" ? t("signInForFollowing") : t("signInForBookmarks")}
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
      ) : (
        <NoteList
          key={feed}
          load={load}
          prepend={showsPosted ? posted : []}
          onQuoted={(note) => setPosted((current) => [note, ...current])}
          empty={<EmptyState title={empty[feed]} className="mt-8" />}
        />
      )}
    </div>
  );
}
