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
import { FollowButton } from "@/modules/blog/components/follow-button";
import { ArticleBody, extractHeadings, readingMinutes } from "../_components/post-blocks";
import { SeriesNav, TagChips } from "../_components/post-meta";
import { authorHref } from "@/modules/blog/components/feed-card";
import { findPublicPost } from "@/modules/blog/api/public-posts";

// Always render fresh. A just-published post must resolve on the first visit (no cached 404 from a
// pre-publish request), and an unpublished/deleted one must 404 immediately. ISR here only ever
// risked serving a stale 404 on the publish→share path; findPublicPost fetches no-store to match.
// The backend reads straight from the DB (no cache layer), so this is one DB read per view — when
// that needs a cache, the right layer is the backend / CDN, not an ISR window that breaks freshness.
export const dynamic = "force-dynamic";

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

function subdomainOrigin(req: ReadonlyHeaders, username: string): string {
  const host = req.get("x-original-host") ?? req.get("host");
  if (!host) return `https://${username}.kurl.me`;
  const cleaned = host.split(":")[0];
  return `https://${cleaned}`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await findPublicPost(username, slug);
  if (!result.ok) return { title: `@${username}` };
  const { author, post } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `${origin}/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: `${origin}/${post.slug}`,
      type: "article",
      siteName: `@${author.username}`,
      images: post.ogImageUrl ? [{ url: post.ogImageUrl }] : undefined,
      locale: post.languageTag,
    },
  };
}

export default async function PublicPostPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;
  const result = await findPublicPost(username, slug);
  const t = await getTranslations({ locale, namespace: "publicPost" });

  if (!result.ok) {
    // backend: UNPUBLISHED → 410, DRAFT/SCHEDULED/missing → 404.
    if (result.status === 410) return <GonePage username={username} locale={locale} t={t} />;
    notFound();
  }

  const { author, post, blocks } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  const postUrl = `${origin}/${post.slug}`;
  const minutes = readingMinutes(blocks);
  const headings = extractHeadings(blocks);

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
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt={`@${author.username}`}
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-100 text-base font-semibold text-accent-700">
                {author.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
              @{author.username}
            </span>
          </a>
          {author.bio && (
            <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-500">
              {author.bio}
            </p>
          )}
          <div className="mt-4">
            <FollowButton username={author.username} initialFollowerCount={0} />
          </div>
        </div>
      </aside>

      <article className="mx-auto w-full max-w-2xl py-14 sm:py-20" lang={post.languageTag}>
        <ViewBeacon username={username} slug={slug} />

      <header className="mb-12">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {post.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* <xl: full author identity + follow inline. xl: those move to the left rail, so the header
              keeps only date·reading time + share — no duplicated author/follow at the top. */}
          <a
            href={authorHref(author.username, locale)}
            className="group flex min-w-0 items-center gap-3 rounded focus-ring xl:hidden"
          >
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt={`@${author.username}`}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                {author.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                @{author.username}
              </span>
              <span className="block text-[13px] text-slate-500">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                {" · "}
                {t("readingTime", { minutes })}
              </span>
            </span>
          </a>
          <p className="hidden text-[13px] text-slate-500 xl:block">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
            {" · "}
            {t("readingTime", { minutes })}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="xl:hidden">
              <FollowButton username={author.username} initialFollowerCount={0} showCount={false} />
            </span>
            <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
          </div>
        </div>
      </header>

      {result.data.series && (
        <SeriesNav series={result.data.series} username={author.username} locale={locale} />
      )}

      <ArticleBody blocks={blocks} />

      {post.tags.length > 0 && (
        <div className="mt-10">
          <TagChips tags={post.tags} />
        </div>
      )}

      <footer className="mt-20 border-t border-slate-100 pt-8 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <a
            href={authorHref(author.username, locale)}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-500 transition-colors hover:text-accent-700 focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("morePosts", { username: author.username })}
          </a>
          <div className="flex items-center gap-3">
            <LikeButton postId={post.id} initialCount={post.likeCount} />
            <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <ReportButton subjectType="POST" subjectId={post.id} />
        </div>
      </footer>

      <PostComments postId={post.id} authorUsername={author.username} />
      </article>

      {headings.length >= 2 && (
        <aside className="hidden py-20 xl:block xl:justify-self-start">
          <div className="sticky top-20 max-h-[calc(100vh-7rem)] w-56 overflow-y-auto">
            <PostToc headings={headings} />
          </div>
        </aside>
      )}

      {/* Mobile/tablet (<xl) get the TOC as a floating button → bottom sheet. */}
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
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900">{t("goneTitle")}</h1>
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
