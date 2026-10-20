"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLikeFailed } from "@/hooks/use-like-failed";
import { likePost, unlikePost } from "@/modules/blog/api/likes";
import type { HomePost } from "@/modules/blog/api/home-feed";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import { useBookmarks } from "@/modules/blog/lib/use-bookmarks";
import { useOptimisticToggle } from "@/modules/blog/lib/use-optimistic-toggle";
import type { Note } from "@/modules/notes/api/notes";
import { NOTE_ACTION, NoteCard, ShareMenu } from "@/modules/notes/components/note-card";
import { NoteGlyph } from "@/modules/notes/components/note-glyph";
import { QuotedPostCard } from "@/modules/notes/components/quoted-post-card";
import { SeriesLine } from "@/modules/blog/components/feed-card";
import { PostBelongingLine } from "@/modules/blog/components/post-belonging-line";

function postAsNote(post: HomePost): Note {
  return {
    id: 0,
    body: "",
    createdAt: post.publishedAt,
    editedAt: null,
    likeCount: null,
    likedByMe: null,
    author: {
      id: post.author.id,
      username: post.author.username,
      avatarUrl: post.author.avatarUrl,
      displayName: post.author.displayName ?? null,
      remoteId: null,
    },
    media: [],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    repostCount: null,
    repostedByMe: null,
    quotedNote: null,
    linkPreview: null,
  } as Note;
}

export function HomePostRow({ post }: { post: HomePost }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const router = useRouter();
  const href = postHref(post.author.username, post.slug, locale);
  const note = useMemo(() => postAsNote(post), [post]);
  const likeFailed = useLikeFailed();
  const [likeTouched, setLikeTouched] = useState(false);
  const like = useOptimisticToggle({
    depKey: post.id,
    syncKey: `like:${post.id}`,
    signInReason: "like",
    onError: likeFailed,
    initialCount: post.likeCount,
    load: () => Promise.resolve({ on: post.likedByMe === true, count: post.likeCount }),
    mutate: (next) =>
      (next ? likePost(post.id) : unlikePost(post.id)).then((s) => ({ on: s.liked, count: s.likeCount })),
  });
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(post.author.username, post.slug);
  const count = like.count ?? 0;

  return (
    <div data-post-id={post.id}>
      <NoteCard
        note={note}
        detached={{
          authorHref: authorHref(post.author.username, locale),
          onAuthor: () => router.push(authorHref(post.author.username, locale)),
          onOpen: () => router.push(href),
          openHref: href,
          seed: post.author.id,
          menu: null,
          content: (
            <>
              <QuotedPostCard
                post={{ ...post, authorUsername: post.author.username }}
                detail={{
                  excerpt: post.excerpt,
                  readMinutes: post.readMinutes,
                  cover: post.thumbnailUrl ?? null,
                  languageTag: post.languageTag,
                }}
              />
              {post.series && post.series.postCount > 1 && (
                <SeriesLine item={post} series={post.series} locale={locale} />
              )}
              <PostBelongingLine postId={post.id} />
            </>
          ),
          footer: (
            <>
              <button
                type="button"
                onClick={() => {
                  setLikeTouched(true);
                  like.toggle();
                }}
                aria-pressed={like.on}
                aria-label={like.on ? t("unlike") : t("like")}
                className={cn(NOTE_ACTION, like.on && "text-accent-700 dark:text-accent-400")}
              >
                <span key={like.on ? "on" : "off"} className={cn("inline-flex", likeTouched && "subscribe-pop")}>
                  <NoteGlyph
                    name="heart"
                    active={like.on}
                    className={cn("h-[18px] w-[18px]", like.on && "text-accent-600")}
                  />
                </span>
                {count > 0 && <span className="tabular-nums">{count}</span>}
              </button>
              <a
                href={`${href}#comments`}
                aria-label={t("postComments", { count: post.commentCount })}
                className={NOTE_ACTION}
              >
                <NoteGlyph name="reply" className="h-[18px] w-[18px]" />
                {post.commentCount > 0 && <span className="tabular-nums">{post.commentCount}</span>}
              </a>
              <button
                type="button"
                onClick={() => void toggle(post.id, post.author.username, post.slug)}
                aria-pressed={saved}
                aria-label={saved ? t("unbookmark") : t("bookmark")}
                className={cn(NOTE_ACTION, saved && "text-accent-700 dark:text-accent-400")}
              >
                <NoteGlyph name="bookmark" active={saved} className="h-[18px] w-[18px]" />
              </button>
              <ShareMenu href={href} buttonClass={NOTE_ACTION} />
            </>
          ),
        }}
      />
    </div>
  );
}
