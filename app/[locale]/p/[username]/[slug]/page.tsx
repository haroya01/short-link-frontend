import { DATE_LOCALE } from "@/lib/date";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { ReportButton } from "@/modules/blog/components/report-button";
import { ShareButton } from "@/modules/blog/components/share-button";
import { ViewBeacon } from "@/modules/blog/components/view-beacon";
import { PostToc, PostTocMobile } from "@/modules/blog/components/post-toc";
import { PostComments } from "@/modules/blog/components/comments";
import { LikeButton } from "@/modules/blog/components/like-button";
import { BookmarkButton } from "@/modules/blog/components/bookmark-button";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { ArticleBody, extractHeadings, readingMinutes } from "../_components/post-blocks";
import { TagChips } from "../_components/post-meta";
import { PostOwnerActions } from "../_components/post-owner-actions";
import { SeriesNav } from "@/modules/blog/components/series-nav";
import { SeriesNext } from "@/modules/blog/components/series-next";
import { RelatedPosts } from "@/modules/blog/components/related-posts";
import { ReadingResume } from "@/modules/blog/components/reading-resume";
import { authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { findPreviewPost, findPublicPost, findPublicSeries } from "@/modules/blog/api/public-posts";
import { authorBaseUrl } from "@/modules/blog/lib/subdomain-origin";

// Always render fresh. A just-published post must resolve on the first visit (no cached 404 from a
// pre-publish request), and an unpublished/deleted one must 404 immediately. ISR here only ever
// risked serving a stale 404 on the publish→share path; findPublicPost fetches no-store to match.
// The backend reads straight from the DB (no cache layer), so this is one DB read per view — when
// that needs a cache, the right layer is the backend / CDN, not an ISR window that breaks freshness.
export const dynamic = "force-dynamic";


function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const { preview } = await searchParams;
  const result = preview ? await findPreviewPost(preview) : await findPublicPost(username, slug);
  if (!result.ok) return { title: `@${username}` };
  const { author, post } = result.data;
  // A preview is an unlisted draft — never let search engines index the shared link.
  if (preview) {
    return { title: post.title, robots: { index: false, follow: false } };
  }
  const h = await headers();
  const origin = authorBaseUrl(h, username);
  const url = `${origin}/${post.slug}`;
  // Always hand crawlers a card image: the post's own cover if set, else the per-post generated card
  // (app/[locale]/p/[username]/[slug]/opengraph-image — the subdomain rewrite maps this back to the
  // route). Without the fallback an image-less post unfurled blank. The URL is already absolute, so
  // metadataBase doesn't rewrite it.
  const ogImage = post.ogImageUrl ?? `${url}/opengraph-image`;
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url,
      type: "article",
      siteName: `@${author.username}`,
      images: [{ url: ogImage }],
      locale: post.languageTag,
      publishedTime: post.publishedAt,
      modifiedTime: post.lastEditedAt ?? undefined,
      authors: [`@${author.username}`],
      tags: post.tags,
    },
    // Set twitter:* explicitly — otherwise the post inherits the root kurl.me site card (generic
    // title/description/image) on X / Slack / any consumer that prefers twitter tags over OpenGraph.
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: [ogImage],
    },
  };
}

export default async function PublicPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { locale, username, slug } = await params;
  const { preview } = await searchParams;
  const isPreview = Boolean(preview);
  const result = preview ? await findPreviewPost(preview) : await findPublicPost(username, slug);
  const t = await getTranslations({ locale, namespace: "publicPost" });

  if (!result.ok) {
    // backend: UNPUBLISHED → 410, DRAFT/SCHEDULED/missing → 404. A bad preview token is a plain 404.
    if (result.status === 410) return <GonePage username={username} locale={locale} t={t} />;
    notFound();
  }

  const { author, post, blocks } = result.data;
  const h = await headers();
  const origin = authorBaseUrl(h, username);
  const postUrl = `${origin}/${post.slug}`;
  const minutes = readingMinutes(blocks);
  // "수정 {date}" hint only when the last edit lands on a LATER DAY than publish — same-day edits
  // (incl. the save-at-publish stamp) read as part of publishing and stay quiet (조용한 웹로그).
  const editedLabel =
    post.lastEditedAt &&
    formatDate(post.lastEditedAt, locale) !== formatDate(post.publishedAt, locale)
      ? formatDate(post.lastEditedAt, locale)
      : null;
  const headings = extractHeadings(blocks);
  // For a series post, pull the full ordered episode list so the banner can show the whole arc with
  // the current part highlighted (the post payload only carries position/total + prev/next).
  const seriesEpisodes =
    result.data.series &&
    (await findPublicSeries(author.username, result.data.series.slug).then((r) =>
      r.ok ? r.data.posts.map((p) => ({ slug: p.slug, title: p.title })) : [],
    ));

  return (
    // Symmetric 3-column grid: equal side gutters keep the 42rem article in the exact page center,
    // the same reading band as the feed/profile. Rails live in the gutters and never shift it.
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 xl:grid-cols-[1fr_minmax(0,42rem)_1fr]">
      {/* Left rail (xl+): a persistent author identity + follow that stays once the in-article header
          scrolls away. In the left gutter, so the centered article doesn't move. */}
      <aside className="hidden py-20 xl:block xl:justify-self-end">
        <div className="sticky top-24 w-52">
          <a
            href={authorHref(author.username, locale)}
            className="group flex items-center gap-3 rounded focus-ring"
          >
            <Avatar src={author.avatarUrl} name={author.username} size="lg" />
            <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
              @{author.username}
            </span>
          </a>
          {author.bio && (
            <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              {author.bio}
            </p>
          )}
          <div className="mt-4">
            <FollowButton username={author.username} initialFollowerCount={0} sourcePostId={post.id} />
          </div>
        </div>
      </aside>

      <article className="post-enter mx-auto w-full max-w-2xl py-14 sm:py-20" lang={post.languageTag}>
        {/* A preview is an unlisted draft shared by its author — don't record a view, and flag it so
            the owner knows this isn't the live page. */}
        {isPreview ? (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            {t("previewBanner")}
          </div>
        ) : (
          <ViewBeacon username={username} slug={slug} />
        )}

      {/* Cover (when set) — contained to the reading column + rounded, not a full-bleed banner, so it
          reads as a quiet lead image in keeping with §10 (조용한 웹로그), the Notion-ish touch without the
          magazine masthead. */}
      {post.ogImageUrl && (
        <div className="mb-10 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800">
          {/* viewTransitionName: 카드에서 클릭된 커버(CoverMorphLink 가 같은 이름을 붙임)가 이
              히어로로 모핑해 들어온다. 페이지에 히어로는 하나뿐이라 정적 이름이어도 충돌 없음. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.ogImageUrl}
            alt=""
            className="aspect-[2/1] w-full object-cover"
            style={{ viewTransitionName: "post-cover" }}
          />
        </div>
      )}

      <header className="mb-12">
        {/* headline-md + bold 고정: 모바일에서 headline-sm(24px semibold)이 본문 h2(24px bold)와
            같은 크기·더 약한 무게라 위계가 뒤집혀 보였다. 제목 32px bold > h2 24px bold > h3 20px. */}
        <h1 className="font-serif text-headline-md font-bold tracking-display text-slate-900 dark:text-slate-100">
          {post.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* <xl: full author identity + follow inline. xl: those move to the left rail, so the header
              keeps only date·reading time + share — no duplicated author/follow at the top. */}
          <a
            href={authorHref(author.username, locale)}
            className="group flex min-w-0 items-center gap-3 rounded focus-ring xl:hidden"
          >
            <Avatar src={author.avatarUrl} name={author.username} size="lg" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                @{author.username}
              </span>
              <span className="block text-[13px] text-slate-500 dark:text-slate-400">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                {" · "}
                {t("readingTime", { minutes })}
                {editedLabel ? ` · ${t("editedOn", { date: editedLabel })}` : ""}
              </span>
            </span>
          </a>
          <p className="hidden text-[13px] text-slate-500 dark:text-slate-400 xl:block">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
            {" · "}
            {t("readingTime", { minutes })}
            {editedLabel ? ` · ${t("editedOn", { date: editedLabel })}` : ""}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="xl:hidden">
              <FollowButton
                username={author.username}
                initialFollowerCount={0}
                showCount={false}
                sourcePostId={post.id}
              />
            </span>
            {/* Like/bookmark at the top too (synced with the footer cluster via syncKey) so the
                reader can react without scrolling to the end. */}
            <LikeButton postId={post.id} initialCount={post.likeCount} />
            <BookmarkButton postId={post.id} />
            <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
            {/* Owner-only 수정/삭제 — renders nothing for other viewers (client-resolved ownership). */}
            <PostOwnerActions postId={post.id} authorUsername={author.username} locale={locale} />
          </div>
        </div>
      </header>

      {result.data.series && (
        <SeriesNav
          series={result.data.series}
          episodes={seriesEpisodes || []}
          currentSlug={post.slug}
          username={author.username}
          locale={locale}
        />
      )}

      <ArticleBody blocks={blocks} postId={post.id} className={headings.length >= 1 ? "has-toc" : undefined} />

      {result.data.series && (
        <SeriesNext series={result.data.series} username={author.username} locale={locale} />
      )}

      {post.tags.length > 0 && (
        <div className="mt-10">
          <TagChips tags={post.tags} />
        </div>
      )}

      <footer className="mt-20 border-t border-slate-100 pt-8 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <a
            href={authorHref(author.username, locale)}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400 focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("morePosts", { username: author.username })}
          </a>
          {/* All post actions live in one cluster — like / bookmark / share, then a hairline and the
              quiet 신고 (a popover, so it never breaks the row) so it reads as a secondary action in the
              group rather than a button orphaned on its own line below. */}
          <div className="flex items-center gap-3">
            <LikeButton postId={post.id} initialCount={post.likeCount} />
            <BookmarkButton postId={post.id} />
            <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
            <span aria-hidden className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <ReportButton subjectType="POST" subjectId={post.id} />
          </div>
        </div>
      </footer>

      <RelatedPosts locale={locale} author={author} currentSlug={post.slug} tags={post.tags} />

      {/* 읽기 이어가기 — 기기 로컬(localStorage), 프리뷰(비공개 토큰 링크)에선 기록하지 않는다. */}
      {!isPreview && <ReadingResume postKey={`${author.username}/${post.slug}`} />}

      <PostComments postId={post.id} authorUsername={author.username} />
      </article>

      {/* velog-style TOC pinned just right of the centered column. Fixed (not a grid gutter) so it
          shows from landscape-tablet width up (~1100px) without shrinking the 42rem reading column or
          breaking its centering. Below that, the floating button → bottom sheet takes over.
          반투명 블러 배경(헤더와 같은 언어): full-bleed 이미지가 TOC 뒤를 지나갈 때 텍스트가
          이미지와 섞이지 않게. wide 는 has-toc 폭 캡(globals.css)이 겹침 자체를 제거. */}
      {headings.length >= 1 && (
        <aside className="fixed left-[calc(50%_+_22.5rem)] top-[8.5rem] z-20 hidden max-h-[calc(100vh_-_10rem)] w-40 overflow-y-auto rounded-xl bg-white/85 p-3 backdrop-blur-sm min-[1100px]:block xl:w-52 dark:bg-slate-950/85">
          <PostToc headings={headings} />
        </aside>
      )}

      {/* Phone / portrait-tablet (<1100px) get the TOC as a floating button → bottom sheet. */}
      <PostTocMobile headings={headings} />
    </div>
  );
}

function GonePage({
  username,
  locale,
  t,
}: {
  username: string;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
      <h1 className="font-serif text-headline-sm font-semibold tracking-display text-slate-900 dark:text-slate-100">{t("goneTitle")}</h1>
      <p className="mt-3 text-slate-500">{t("goneBody")}</p>
      <a
        href={authorHref(username, locale)}
        className="mt-8 inline-flex items-center gap-1.5 rounded text-sm font-medium text-accent-700 transition-colors hover:underline focus-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("morePosts", { username })}
      </a>
    </main>
  );
}
