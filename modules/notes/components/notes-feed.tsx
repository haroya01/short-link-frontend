"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useDismiss } from "@/hooks/use-dismiss";
import { EmptyState } from "@/components/common/empty-state";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { FeedSortTabs, type FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
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

const TABS = ["everyone", "trending", "following"] as const;
const MORE = ["federated", "bookmarks", "direct", "lists"] as const;
const FEEDS = [...TABS, ...MORE] as const;
type Feed = (typeof FEEDS)[number];
type MoreFeed = (typeof MORE)[number];

const LOADERS: Record<Exclude<Feed, "lists">, (page: number) => Promise<NoteFeed>> = {
  everyone: listEveryoneNotes,
  federated: listFederatedNotes,
  following: listFollowingNotes,
  trending: listTrendingNotes,
  bookmarks: listBookmarkedNotes,
  direct: listDirectNotes,
};

const PERSONAL: ReadonlySet<Feed> = new Set(["federated", "following", "bookmarks", "direct", "lists"]);

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
    federated: t("feedFederated"),
    following: t("feedFollowing"),
    trending: t("feedTrending"),
    bookmarks: t("feedBookmarks"),
    direct: t("feedDirect"),
    lists: t("feedLists"),
  };
  const hrefFor = (key: Feed) => (key === "everyone" ? pathname : `${pathname}?feed=${key}`);
  const tabs: FeedSortTab[] = TABS.map((key) => ({
    key,
    label: label[key],
    href: hrefFor(key),
    active: key === feed,
    personal: PERSONAL.has(key),
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <FeedSortTabs tabs={tabs} />
        <div className="flex shrink-0 items-center gap-3">
          {reposts.shown !== null && (
            <label className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              {t("showReposts")}
              <Switch
                checked={reposts.shown}
                onCheckedChange={reposts.set}
                aria-label={t("showReposts")}
              />
            </label>
          )}
          {ready && authenticated && (
            <MoreFeedsMenu
              active={(MORE as readonly string[]).includes(feed) ? (feed as MoreFeed) : null}
              items={MORE.map((key) => ({ key, label: label[key], href: hrefFor(key) }))}
            />
          )}
        </div>
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
              : feed === "federated"
                ? t("signInForFederated")
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

function MoreFeedsMenu({
  active,
  items,
}: {
  active: MoreFeed | null;
  items: { key: MoreFeed; label: string; href: string }[];
}) {
  const t = useTranslations("notes");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const current = items.find((item) => item.key === active);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`focus-ring touch-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
          current
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "border border-slate-200 text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
        }`}
      >
        {current?.label ?? t("feedMore")}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ease-[var(--ease)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-48 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              role="menuitem"
              aria-current={item.key === active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800 ${
                item.key === active
                  ? "font-semibold text-slate-900 dark:text-slate-100"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
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
