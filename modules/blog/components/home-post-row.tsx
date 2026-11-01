"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLikeFailed } from "@/hooks/use-like-failed";
import { getLikeStatus, likePost, unlikePost } from "@/modules/blog/api/likes";
import type { HomePost } from "@/modules/blog/api/home-feed";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import { useBookmarks } from "@/modules/blog/lib/use-bookmarks";
import { useOptimisticToggle } from "@/modules/blog/lib/use-optimistic-toggle";
import type { Note } from "@/modules/notes/api/notes";
import { NOTE_ACTION, NoteCard, ShareMenu } from "@/modules/notes/components/note-card";
import { NoteGlyph } from "@/modules/notes/components/note-glyph";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { AudienceMark } from "@/modules/blog/components/audience-mark";
import { CoverThumb } from "@/modules/blog/components/cover-thumb";
import { SeriesLine } from "@/modules/blog/components/feed-card";
import { PostBelongingLine } from "@/modules/blog/components/post-belonging-line";

export type PostRowItem = PublicFeedItem & Partial<Pick<HomePost, "readMinutes" | "commentCount" | "likedByMe" | "room">>;

function postAsNote(post: PostRowItem): Note {
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
    room: post.room ?? null,
  } as Note;
}

export function HomePostRow({ post, context }: { post: PostRowItem; context?: ReactNode }) {
  const t = useTranslations("notes");
  const tPost = useTranslations("publicPost");
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
    load: () =>
      post.likedByMe != null
        ? Promise.resolve({ on: post.likedByMe, count: post.likeCount })
        : getLikeStatus(post.id).then((s) => ({ on: s.liked })),
    mutate: (next) =>
      (next ? likePost(post.id) : unlikePost(post.id)).then((s) => ({ on: s.liked, count: s.likeCount })),
  });
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(post.author.username, post.slug);
  const count = like.count ?? 0;
  const comments = post.commentCount ?? 0;

  return (
    <div data-post-id={post.id}>
      <NoteCard
        note={note}
        context={context}
        detached={{
          authorHref: authorHref(post.author.username, locale),
          onAuthor: () => router.push(authorHref(post.author.username, locale)),
          onOpen: () => router.push(href),
          openHref: href,
          menu: null,
          content: (
            <>
              <a href={href} data-home-post-body className="focus-ring mt-0.5 block rounded-inner">
                <span className="block min-w-0">
                  <span
                    lang={contentLang(post.title, post.languageTag)}
                    className="line-clamp-3 text-card-title-sm font-bold leading-[1.3] tracking-tight text-slate-900 dark:text-slate-100"
                  >
                    {post.title}
                  </span>
                  {post.excerpt && (
                    <span
                      lang={contentLang(post.excerpt, post.languageTag)}
                      className="mt-1 line-clamp-2 text-[14px] leading-snug text-slate-600 dark:text-slate-400"
                    >
                      {post.excerpt}
                    </span>
                  )}
                  <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                    <span className="shrink-0">{t("quotedPostKind")}</span>
                    {post.readMinutes != null && (
                      <>
                        <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="shrink-0">{tPost("ogReadingTime", { minutes: post.readMinutes })}</span>
                      </>
                    )}
                    <AudienceMark item={post} />
                  </span>
                </span>
                {post.thumbnailUrl && (
                  <span
                    data-home-post-cover
                    className="mt-2.5 block aspect-[16/9] w-full overflow-hidden rounded-surface bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800"
                  >
                    <CoverThumb src={post.thumbnailUrl} sizes="(max-width: 640px) 100vw, 600px" className="h-full w-full object-cover" />
                  </span>
                )}
              </a>
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
                aria-label={t("postComments", { count: comments })}
                className={NOTE_ACTION}
              >
                <NoteGlyph name="reply" className="h-[18px] w-[18px]" />
                {comments > 0 && <span className="tabular-nums">{comments}</span>}
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
              {!post.room && <ShareMenu href={href} buttonClass={NOTE_ACTION} />}
            </>
          ),
        }}
      />
    </div>
  );
}
