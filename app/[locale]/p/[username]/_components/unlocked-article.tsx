"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { DATE_LOCALE } from "@/lib/date";
import type { PublicPostDetail } from "@/modules/blog/api/public-posts";
import { extractHeadings } from "@/modules/blog/components/article-blocks";
import { ClientArticleBody } from "@/modules/blog/components/client-article-body";
import { AuthorOnly } from "@/modules/blog/components/author-gate";
import { PostComments } from "@/modules/blog/components/comments";
import { PostAuthorCard } from "@/modules/blog/components/post-author-card";
import { PostDock } from "@/modules/blog/components/post-dock";
import { LegacyHeadingHash, PostToc } from "@/modules/blog/components/post-toc";
import { PublishCelebration } from "@/modules/blog/components/publish-celebration";
import { ReadBeacon } from "@/modules/blog/components/read-beacon";
import { ReadProgressBeacon } from "@/modules/blog/components/read-progress-beacon";
import { ReadingResume } from "@/modules/blog/components/reading-resume";
import { ViewBeacon } from "@/modules/blog/components/view-beacon";
import { PostHighlights } from "./post-highlights";
import { TagChips } from "./post-meta";
import { PostActionRow } from "./post-action-row";

function dayLabel(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export function UnlockedArticle({
  detail,
  locale,
  postUrl,
}: {
  detail: PublicPostDetail;
  locale: string;
  postUrl: string;
}) {
  const t = useTranslations("publicPost");
  const { author, post, blocks } = detail;
  const headings = useMemo(() => extractHeadings(blocks), [blocks]);
  const tocHeadings = useMemo(() => headings.filter((h) => h.level <= 2), [headings]);
  const editedLabel =
    post.lastEditedAt && dayLabel(post.lastEditedAt, locale) !== dayLabel(post.publishedAt, locale)
      ? dayLabel(post.lastEditedAt, locale)
      : null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div data-testid="unlocked-article">
      <ViewBeacon username={author.username} slug={post.slug} postId={post.id} />
      <ReadBeacon postId={post.id} />
      <ReadProgressBeacon postId={post.id} />

      {post.ogImageUrl && (
        <div className="mb-10 overflow-hidden rounded-surface bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.ogImageUrl}
            alt=""
            decoding="async"
            className="aspect-[2/1] max-h-[380px] w-full object-cover dark:brightness-90"
          />
        </div>
      )}

      <ClientArticleBody blocks={blocks} postId={post.id} className={headings.length >= 1 ? "has-toc" : undefined} />
      <PostHighlights postId={post.id} />

      {post.tags.length > 0 && (
        <div className="mt-8" data-testid="post-tags">
          <TagChips tags={post.tags} />
        </div>
      )}

      {editedLabel && (
        <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">{t("editedOn", { date: editedLabel })}</p>
      )}

      <footer className="-ml-2.5 mt-8" data-testid="post-actions">
        <PostActionRow
          postId={post.id}
          postTitle={post.title}
          postSlug={post.slug}
          postUrl={postUrl}
          likeCount={post.likeCount}
          authorUsername={author.username}
          locale={locale}
        />
      </footer>

      <div data-post-end aria-hidden />

      <PostAuthorCard author={author} locale={locale} postId={post.id} />
      <PostComments postId={post.id} authorUsername={author.username} title={post.title} slug={post.slug} />
      <ReadingResume postKey={`${author.username}/${post.slug}`} />
      <PublishCelebration slug={post.slug} />
      <LegacyHeadingHash headings={headings} />

      {mounted &&
        createPortal(
          <AuthorOnly username={author.username}>
            {tocHeadings.length >= 1 && (
              <aside className="fixed left-[calc(50%_+_22.5rem)] top-[8.5rem] z-20 hidden max-h-[calc(100vh_-_10rem)] w-40 overflow-y-auto rounded-surface bg-white p-3 min-[1100px]:block xl:w-52 dark:bg-slate-950">
                <PostToc headings={tocHeadings} />
              </aside>
            )}
            <PostDock postId={post.id} postTitle={post.title} likeCount={post.likeCount} headings={tocHeadings} />
          </AuthorOnly>,
          document.body,
        )}
    </div>
  );
}
