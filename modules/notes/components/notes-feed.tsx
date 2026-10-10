"use client";

import { useCallback, useEffect, useState } from "react";
import { AtSign, Bookmark, Globe, List, Users, type LucideIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import type { SignInReason } from "@/components/auth/login-prompt";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { EmptyState } from "@/components/common/empty-state";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
import { FeedSwitcher } from "@/modules/blog/components/feed-switcher";
import type { NotesSwitcherFeed } from "@/modules/blog/lib/feed-memory";
import {
  getNoteFeedPreferences,
  listBookmarkedNotes,
  listDirectNotes,
  listEveryoneNotes,
  listFederatedNotes,
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
  const empty: Record<Feed, string> = {
    everyone: t("emptyAuthor"),
    federated: t("emptyFederated"),
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
      <div className="mb-2">
        <FeedSwitcher
          surface="notes"
          tabs={tabs}
          more={MORE.map((key) => ({ key, label: label[key], href: hrefFor(key), active: key === feed }))}
          trailing={
            reposts.shown !== null && (
              <label className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
                {t("showReposts")}
                <Switch checked={reposts.shown} onCheckedChange={reposts.set} aria-label={t("showReposts")} />
              </label>
            )
          }
        />
      </div>
      <div className="border-b border-slate-100 dark:border-slate-800">
        {ready && authenticated ? (
          <NoteComposer
            quote={quote}
            onClearQuote={() => setQuote(null)}
            onCreated={(note) => setPosted((current) => [note, ...current])}
          />
        ) : (
          <NoteSignInRow reason="note" placeholder={t("composerPlaceholder")} />
        )}
      </div>
      {PERSONAL.has(feed) && signedOut ? (
        <SignInEmptyState {...SIGN_IN[feed]!} />
      ) : feed === "lists" ? (
        <NoteListsPanel selectedId={listId} />
      ) : (
        <NoteList
          key={`${feed}:${reposts.version}`}
          load={load}
          prepend={showsPosted ? posted : []}
          onQuoted={(note) => setPosted((current) => [note, ...current])}
          empty={<EmptyState title={empty[feed]} className="mt-8" />}
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
