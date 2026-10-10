"use client";

import { useCallback, useEffect, useState } from "react";
import { AtSign, Bookmark, Flame, Globe, List, MessageSquareText, Users, type LucideIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import type { SignInReason } from "@/components/auth/login-prompt";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { SignInRow } from "@/components/auth/sign-in-row";
import { useToast } from "@/components/ui/toast";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import type { FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
import type { FeedMoreItem } from "@/modules/blog/components/feed-more-menu";
import { onNotePosted } from "@/modules/blog/lib/consequence-events";
import { FeedSwitcher } from "@/modules/blog/components/feed-switcher";
import type { NotesSwitcherFeed } from "@/modules/blog/lib/feed-memory";
import {
  getNoteFeedPreferences,
  listBookmarkedNotes,
  listDirectNotes,
  listEveryoneNotes,
  listFederatedNotes,
  listFollowingNotes,
  listNoteLists,
  listTrendingNotes,
  setShowReposts,
  type Note,
  type NoteFeed,
  type NoteListSummary,
  type QuotedPost,
} from "@/modules/notes/api/notes";
import { NoteComposer } from "./note-composer";
import { NoteList } from "./note-list";
import { NoteListTimeline, NoteListUnpicked } from "./note-lists";

const TABS = ["following", "everyone", "trending"] as const;
const MORE = ["federated", "bookmarks", "direct", "lists"] as const;
const FEEDS = [...TABS, ...MORE] as const;
type Feed = (typeof FEEDS)[number];

const LOADERS: Record<Exclude<Feed, "lists">, (page: number) => Promise<NoteFeed>> = {
  everyone: listEveryoneNotes,
  federated: listFederatedNotes,
  following: listFollowingNotes,
  trending: listTrendingNotes,
  bookmarks: listBookmarkedNotes,
  direct: listDirectNotes,
};

const PERSONAL: ReadonlySet<Feed> = new Set(["federated", "following", "bookmarks", "direct", "lists"]);
const SIGN_IN: Partial<Record<Feed, { reason: SignInReason; icon: LucideIcon }>> = {
  following: { reason: "followingNotes", icon: Users },
  federated: { reason: "federatedNotes", icon: Globe },
  direct: { reason: "direct", icon: AtSign },
  lists: { reason: "lists", icon: List },
  bookmarks: { reason: "noteBookmarks", icon: Bookmark },
};

function feedOf(value: string | null, saved: NotesSwitcherFeed | null): Feed {
  if (value === null) return saved ?? "everyone";
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

export function NotesFeed({ savedFeed = null }: { savedFeed?: NotesSwitcherFeed | null }) {
  const t = useTranslations("notes");
  const tFeed = useTranslations("publicFeed");
  const params = useSearchParams();
  const pathname = usePathname();
  const { ready, authenticated } = useAuth();
  const [quote, setQuote] = useState<QuotedPost | null>(() => quoteFromParams(params));
  const [posted, setPosted] = useState<Note[]>([]);
  useEffect(() => onNotePosted((note) => setPosted((current) => [note, ...current])), []);
  const feed = feedOf(params.get("feed"), savedFeed);
  const load = useCallback(
    (page: number) => (feed === "lists" ? Promise.resolve({ items: [], page, hasNext: false }) : LOADERS[feed](page)),
    [feed],
  );
  const listId = Number(params.get("list")) || null;
  const label: Record<Feed, string> = {
    everyone: tFeed("recent"),
    federated: t("feedFederated"),
    following: tFeed("feed"),
    trending: tFeed("trending"),
    bookmarks: t("feedBookmarks"),
    direct: t("feedDirect"),
    lists: t("feedLists"),
  };
  const hrefFor = (key: Feed) => `${pathname}?feed=${key}`;
  const tabs: FeedSortTab[] = TABS.map((key) => ({
    key,
    label: label[key],
    href: hrefFor(key),
    active: key === feed,
  }));
  const empty: Record<Feed, { icon: LucideIcon; title: string; body?: string }> = {
    everyone: { icon: MessageSquareText, title: t("emptyAuthor") },
    federated: { icon: Globe, title: t("emptyFederated"), body: t("emptyFederatedBody") },
    following: { icon: Users, title: t("emptyFollowingTitle"), body: t("emptyFollowing") },
    trending: { icon: Flame, title: t("emptyTrending") },
    bookmarks: { icon: Bookmark, title: t("emptyBookmarks"), body: t("emptyBookmarksBody") },
    direct: { icon: AtSign, title: t("emptyDirect"), body: t("emptyDirectBody") },
    lists: { icon: List, title: t("listEmpty"), body: t("listEmptyBody") },
  };
  const signedOut = ready && !authenticated;
  const showsPosted = feed === "everyone" || feed === "following";
  const reposts = useShowReposts(feed === "following" && ready && authenticated);
  const lists = useNoteLists(ready && authenticated);
  const openList = feed === "lists" ? (lists?.find((list) => list.id === listId) ?? null) : null;
  const more: FeedMoreItem[] = [
    { key: "federated", label: label.federated, icon: "globe", href: hrefFor("federated"), active: feed === "federated" },
    { key: "bookmarks", label: label.bookmarks, icon: "bookmark", href: hrefFor("bookmarks"), active: feed === "bookmarks" },
    {
      key: "direct",
      label: label.direct,
      shortLabel: t("feedDirectShort"),
      icon: "mention",
      href: hrefFor("direct"),
      active: feed === "direct",
    },
    ...(lists ?? []).map((list) => ({
      key: `list-${list.id}`,
      label: list.title,
      icon: "list" as const,
      href: `${pathname}?feed=lists&list=${list.id}`,
      active: openList?.id === list.id,
    })),
  ];

  return (
    <div>
      <div className="mb-2">
        <FeedSwitcher
          surface="notes"
          tabs={tabs}
          more={more}
          toggles={
            reposts.shown === null
              ? undefined
              : [{ key: "reposts", label: t("showReposts"), checked: reposts.shown, onChange: reposts.set }]
          }
        />
      </div>
      <div className="border-b border-slate-100 dark:border-slate-800">
        {!ready ? (
          <div aria-hidden className="h-[60px]" />
        ) : authenticated ? (
          <NoteComposer
            quote={quote}
            onClearQuote={() => setQuote(null)}
            onCreated={(note) => setPosted((current) => [note, ...current])}
          />
        ) : (
          <SignInRow reason="note" placeholder={t("composerPlaceholder")} />
        )}
      </div>
      {PERSONAL.has(feed) && signedOut ? (
        <SignInEmptyState {...SIGN_IN[feed]!} />
      ) : feed === "lists" ? (
        openList ? (
          <NoteListTimeline list={openList} />
        ) : (
          lists && <NoteListUnpicked hasLists={lists.length > 0} />
        )
      ) : (
        <NoteList
          key={`${feed}:${reposts.version}`}
          load={load}
          prepend={showsPosted ? posted : []}
          onQuoted={(note) => setPosted((current) => [note, ...current])}
          empty={<BlogEmpty {...empty[feed]} />}
          filterContext={
            feed === "following"
              ? "home"
              : feed === "everyone" || feed === "federated" || feed === "trending"
                ? "public"
                : undefined
          }
        />
      )}
    </div>
  );
}

function useNoteLists(active: boolean) {
  const [lists, setLists] = useState<NoteListSummary[] | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    listNoteLists()
      .then((loaded) => live && setLists(loaded))
      .catch(() => live && setLists([]));
    return () => {
      live = false;
    };
  }, [active]);
  return lists;
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
