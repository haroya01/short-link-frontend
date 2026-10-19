"use client";

import { useEffect, useState } from "react";
import { AtSign, Bookmark, List, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import type { SignInReason } from "@/components/auth/login-prompt";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { FeedSortTabs } from "@/modules/blog/components/feed-sort-tabs";
import {
  listBookmarkedNotes,
  listDirectNotes,
  listNoteLists,
  type NoteFeed,
  type NoteListSummary,
} from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";
import { NoteListTimeline, NoteListUnpicked } from "./note-lists";

export const NOTE_SHELVES = ["bookmarks", "direct", "lists"] as const;
export type NoteShelf = (typeof NOTE_SHELVES)[number];

const LOADERS: Record<Exclude<NoteShelf, "lists">, (page: number) => Promise<NoteFeed>> = {
  bookmarks: listBookmarkedNotes,
  direct: listDirectNotes,
};

const SIGN_IN: Record<NoteShelf, { reason: SignInReason; icon: LucideIcon }> = {
  direct: { reason: "direct", icon: AtSign },
  lists: { reason: "lists", icon: List },
  bookmarks: { reason: "noteBookmarks", icon: Bookmark },
};

export function NotesFeed({ shelf, listId = null }: { shelf: NoteShelf; listId?: number | null }) {
  const t = useTranslations("notes");
  const tNav = useTranslations("nav");
  const { ready, authenticated } = useAuth();
  const lists = useNoteLists(ready && authenticated && shelf === "lists");
  const title: Record<NoteShelf, string> = {
    bookmarks: tNav("noteBookmarks"),
    direct: t("feedDirect"),
    lists: tNav("noteLists"),
  };
  const empty: Record<Exclude<NoteShelf, "lists">, { title: string; body?: string }> = {
    bookmarks: { title: t("emptyBookmarks") },
    direct: { title: t("emptyDirect"), body: t("emptyDirectBody") },
  };

  return (
    <div>
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {title[shelf]}
      </h1>
      {ready && !authenticated ? (
        <SignInEmptyState {...SIGN_IN[shelf]} />
      ) : shelf === "lists" ? (
        <ListsShelf lists={lists} listId={listId} />
      ) : (
        <div className="mt-2">
          <NoteList key={shelf} load={LOADERS[shelf]} empty={<BlogEmpty {...empty[shelf]} />} />
        </div>
      )}
    </div>
  );
}

function ListsShelf({ lists, listId }: { lists: NoteListSummary[] | null; listId: number | null }) {
  const pathname = usePathname();
  if (lists === null) return null;
  if (lists.length === 0) return <NoteListUnpicked hasLists={false} />;
  const open = lists.find((list) => list.id === listId) ?? lists[0];
  return (
    <>
      <div className="mt-4 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <FeedSortTabs
          tabs={lists.map((list) => ({
            key: String(list.id),
            label: list.title,
            href: `${pathname}?feed=lists&list=${list.id}`,
            active: list.id === open.id,
          }))}
        />
      </div>
      <NoteListTimeline key={open.id} list={open} />
    </>
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
