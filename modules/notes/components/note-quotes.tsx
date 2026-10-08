"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { listNoteQuotes, listQuotingPosts } from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

export function NoteQuotes({ noteId }: { noteId: number }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const load = useCallback((page: number) => listNoteQuotes(noteId, page), [noteId]);
  const [posts, setPosts] = useState<PublicFeedItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    listQuotingPosts(noteId)
      .then((view) => alive && setPosts(view.items))
      .catch(() => alive && setPosts([]));
    return () => {
      alive = false;
    };
  }, [noteId]);

  const carried = posts !== null && posts.length > 0;
  return (
    <>
      {carried && (
        <section
          aria-labelledby="quoting-posts-title"
          data-testid="quoting-posts"
          className="mb-4 rounded-surface border border-slate-200 px-4 pt-3 dark:border-slate-800"
        >
          <h2 id="quoting-posts-title" className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {t("quotingPostsTitle")}
          </h2>
          <FeedList>
            {posts.map((item, i) => (
              <FeedCard key={item.id} item={item} locale={locale} showBookmark={false} flushTop={i === 0} />
            ))}
          </FeedList>
        </section>
      )}
      <NoteList
        load={load}
        filterContext="public"
        empty={posts === null || carried ? null : <EmptyState title={t("quotesEmpty")} className="mt-8" />}
      />
    </>
  );
}
