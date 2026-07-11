import { DATE_LOCALE } from "@/lib/date";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { ReportButton } from "@/modules/blog/components/report-button";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { ShareButton } from "@/modules/blog/components/share-button";
import { ViewBeacon } from "@/modules/blog/components/view-beacon";
import { ReadBeacon } from "@/modules/blog/components/read-beacon";
import { PostToc, PostTocMobile } from "@/modules/blog/components/post-toc";
import { PostComments } from "@/modules/blog/components/comments";
import { LikeButton } from "@/modules/blog/components/like-button";
import { BookmarkButton } from "@/modules/blog/components/bookmark-button";
import { ConnectButton } from "@/modules/blog/components/connect-button";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { ArticleBody, extractHeadings, readingMinutes } from "../_components/post-blocks";
import { PostHighlights } from "../_components/post-highlights";
import { TagChips } from "../_components/post-meta";
import { PostOwnerActions } from "../_components/post-owner-actions";
import { SeriesNav } from "@/modules/blog/components/series-nav";
import { SeriesNext } from "@/modules/blog/components/series-next";
import { PostEdges } from "@/modules/blog/components/post-edges";
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

// 브랜드(publisher) URL — Article rich result 의 publisher.logo 는 kurl.me 기준(글은 작가 서브도메인).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
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
      images: [{ url: ogImage, width: 2400, height: 1260, alt: post.title }],
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
  // 제목 위 조용한 eyebrow — 시리즈에 속하면 시리즈명, 아니면 대표 태그(tags[0]), 둘 다 없으면 없음.
  // 컬러 배지 없이 회색 muted 한 줄(피드 카드 TagEyebrow 와 같은 어휘) — 제목 앞에 맥락 한 겹만.
  const eyebrow = result.data.series ? result.data.series.title : (post.tags[0] ?? null);
  // For a series post, pull the full ordered episode list so the banner can show the whole arc with
  // the current part highlighted (the post payload only carries position/total + prev/next).
  const seriesEpisodes =
    result.data.series &&
    (await findPublicSeries(author.username, result.data.series.slug).then((r) =>
      r.ok ? r.data.posts.map((p) => ({ slug: p.slug, title: p.title })) : [],
    ));

  // Article schema — the og:article tags above only feed social unfurls; Google's article rich
  // results (headline + byline + image in SERP) need this JSON-LD. Mirrors the ProfilePage>Person
  // pattern on the profile pages. Previews are noindex'd drafts, so they don't emit one.
  const articleJsonLd = isPreview
    ? null
    : {
        "@context": "https://schema.org",
        // BlogPosting = Article 의 블로그 특화 하위 타입(같은 rich result, 더 정확한 신호).
        "@type": "BlogPosting",
        headline: post.title,
        ...(post.excerpt ? { description: post.excerpt } : {}),
        image: [post.ogImageUrl ?? `${postUrl}/opengraph-image`],
        url: postUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
        datePublished: post.publishedAt,
        ...(post.lastEditedAt ? { dateModified: post.lastEditedAt } : {}),
        inLanguage: post.languageTag,
        ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
        author: {
          "@type": "Person",
          name: author.username,
          alternateName: `@${author.username}`,
          url: origin,
        },
        // publisher(+logo) — Google Article rich result 가 권장하는 발행처 엔티티(브랜드 = kurl).
        publisher: {
          "@type": "Organization",
          name: "kurl",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
        },
      };

  // 빵부스러기 — 작가 홈 → 이 글. SERP 의 breadcrumb 표시 + 사이트 구조 신호.
  const breadcrumbJsonLd = isPreview
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: `@${author.username}`, item: origin },
          { "@type": "ListItem", position: 2, name: post.title, item: postUrl },
        ],
      };

  return (
    // Symmetric 3-column grid: equal side gutters keep the 42rem article in the exact page center,
    // the same reading band as the feed/profile (§10.1 max-w-7xl 불변식). Rails live in the gutters and
    // never shift it. xl:gap-6 (not gap-10) tightens the two gutters so the rail content sits closer to
    // the reading column — the wide gutter left the author block floating alone far to the left; a
    // snugger gap gives the three columns a shared rhythm without touching the 42rem band.
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-6">
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {/* Left rail (xl+): a persistent author identity + follow that stays once the in-article header
          scrolls away. In the left gutter, justify-self-end so it hugs the reading column instead of
          floating alone at the far edge; w-64 fills the gutter so the void reads as an even ~24px inset
          on either side of the rail (matching the grid gap) rather than a lonely avatar in wide empty
          space. The centered 42rem article never moves. */}
      <aside className="hidden py-20 xl:block xl:justify-self-end">
        <div className="sticky top-28 w-64">
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
          <>
            <ViewBeacon username={username} slug={slug} />
            {/* Account-synced reading history for signed-in readers (no-op for anonymous). */}
            <ReadBeacon postId={post.id} />
          </>
        )}

      {/* 마스트헤드 아래 조용한 헤어라인(§10.1 border-slate-100 계열)으로 제목·메타를 하나의 블록으로
          닫는다 — xl 에선 헤더가 얇은 메타 한 줄뿐이라 닫는 선이 없으면 본문과 경계가 흐릿했다. */}
      <header className="mb-12 border-b border-slate-100 pb-8 dark:border-slate-800">
        {eyebrow && (
          <p className="mb-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">{eyebrow}</p>
        )}
        {/* 모바일 30px → sm+ 37px: 힘은 크기가 아니라 weight(bold)+tight tracking 에서. 이전 32/40px 은
            좁은 뷰포트에서 두 줄로 크게 쏟아져 포트폴리오 목업처럼 읽혔다 — 스텝만 ~6% 줄여 절제하되,
            본문 h2(24px)보다는 항상 확실히 크게(30 > 24) 유지해 위계는 그대로. leading 은 큰 디스플레이의
            tight 감(1.15/1.1)을 이어간다. */}
        <h1 className="text-headline-post font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-post-lg">
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
            <LikeButton postId={post.id} initialCount={post.likeCount} postTitle={post.title} />
            <BookmarkButton postId={post.id} />
            <ConnectButton postId={post.id} postTitle={post.title} />
            <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
            {/* Owner-only 수정/삭제 — renders nothing for other viewers (client-resolved ownership). */}
            <PostOwnerActions postId={post.id} authorUsername={author.username} locale={locale} />
          </div>
        </div>
      </header>

      {/* Cover — Fork A(제목-먼저): 커버를 헤더(제목·byline) 아래로 내려 도착 페이지를 OG 카드의
          "제목이 히어로" 구성과 일치시킨다. 읽기 컬럼 폭 + rounded-2xl + ring 은 그대로 두고, 2:1
          리드에 max-h 캡을 둬 뷰포트에서 과도하게 커져 본문 시작을 밀지 않게 한다. 모바일도 동일 순서. */}
      {post.ogImageUrl && (
        <div className="mb-10 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800">
          {/* vt-post-cover: 카드에서 클릭된 커버(CoverMorphLink 가 같은 이름을 붙임)가 이 히어로로
              모핑해 들어온다. 페이지에 히어로는 하나뿐이라 정적 이름이어도 충돌 없음 — 클래스인
              이유는 테마 토글 전환에서 이름을 떼기 위해(globals 의 html[data-theme-vt] 규칙). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* 커버는 대부분 이 페이지의 LCP 요소 — 프로필/쇼케이스 배너와 같이 high 우선순위로
              큐잉해 느린 회선에서 본문 위 히어로가 늦게 채워지지 않게 한다. */}
          <img
            src={post.ogImageUrl}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="vt-post-cover aspect-[2/1] max-h-[380px] w-full object-cover"
          />
        </div>
      )}

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
      <PostHighlights postId={post.id} />

      {/* 이 글이 놓인 길 · 이어진 것 · 이은 사람 — the post as a node with visible edges. Renders
          nothing when the post sits on no edge yet; the tag-based RelatedPosts below is the fallback
          so the article is never a dead end (§10: one green thread, no node-graph). */}
      <PostEdges postId={post.id} authorUsername={author.username} locale={locale} />

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
            <LikeButton postId={post.id} initialCount={post.likeCount} postTitle={post.title} />
            <BookmarkButton postId={post.id} />
            <ConnectButton postId={post.id} postTitle={post.title} />
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

      {/* Quiet viral-loop badge — every shared post carries a followable link back to kurl. Drafts
          (preview) skip it. Centered + muted so it reads as a colophon, not an ad (§10). */}
      {!isPreview && (
        <div className="mt-16 flex justify-center">
          <MadeWithKurl />
        </div>
      )}
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
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("goneTitle")}</h1>
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
