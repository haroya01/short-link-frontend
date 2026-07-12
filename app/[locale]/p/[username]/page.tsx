import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ReportButton } from "@/modules/blog/components/report-button";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { FeedCard, FeedList, authorHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { AuthorRail } from "@/modules/blog/components/author-rail";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { authorBaseUrl } from "@/modules/blog/lib/subdomain-origin";

// 30s ISR — author 발행 후 30 초 내 visitors 반영. Backend 가 어차피 매번 직접 조회.
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) return { title: `@${username}` };
  const { author } = result.data;
  const h = await headers();
  const origin = authorBaseUrl(h, username);
  const ogImage = author.avatarUrl
    ? [{ url: author.avatarUrl, width: 1200, height: 630, alt: `@${author.username}` }]
    : undefined;
  return {
    title: `@${author.username}`,
    description: author.bio ?? undefined,
    alternates: {
      canonical: `${origin}/`,
      types: { "application/rss+xml": `${origin}/feed` },
    },
    openGraph: {
      title: `@${author.username}`,
      description: author.bio ?? undefined,
      url: `${origin}/`,
      type: "profile",
      images: ogImage,
    },
    // Without an explicit twitter card the author home inherits the generic site card on X/Slack.
    twitter: {
      card: author.avatarUrl ? "summary" : "summary",
      title: `@${author.username}`,
      description: author.bio ?? undefined,
      images: author.avatarUrl ? [author.avatarUrl] : undefined,
    },
  };
}

export default async function PublicProfileHomepage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale, username } = await params;
  const { tag: rawTag } = await searchParams;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();

  const { author, posts } = result.data;
  const seriesResult = await listPublicSeries(username);
  const series = seriesResult.ok ? seriesResult.data.series : [];
  const t = await getTranslations({ locale, namespace: "publicPost" });

  // ProfilePage > Person — the author entity for this weblog home. Mirrors the link-in-bio profile
  // (/u/{user}) Person node so Google can tie the two surfaces to one person (rich-snippet byline,
  // knowledge-panel candidate). Author subdomain is the canonical home, so url points there.
  const h = await headers();
  const origin = authorBaseUrl(h, username);
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${origin}/`,
    mainEntity: {
      "@type": "Person",
      name: author.username,
      alternateName: `@${author.username}`,
      url: `${origin}/`,
      ...(author.bio ? { description: author.bio } : {}),
      ...(author.avatarUrl ? { image: author.avatarUrl } : {}),
    },
  };

  // Tag filter is author-scoped: it narrows THIS author's posts (the rail links here with ?tag=),
  // never the cross-author topic feed. Keep the full list for the rail's tag/archive derivation.
  const activeTag = rawTag?.trim() || undefined;
  const visiblePosts = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;

  // 대표글(author-pinned) lead the home in their own labelled section so the ordering reads as a
  // deliberate highlight, not an unexplained reshuffle. Under a tag filter the section split is
  // dropped — the filter is the organizing principle there, so just show the flat filtered list.
  const pinnedPosts = activeTag ? [] : visiblePosts.filter((p) => p.pinned);
  const recentPosts = activeTag ? visiblePosts : visiblePosts.filter((p) => !p.pinned);

  // The author header (identity + tabs) is rendered once by the persistent layout (ProfileChrome) so
  // it never re-mounts on a tab switch; this page renders only its content column + rail.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <ReadingShell
        className="mt-8"
        rail={
          posts.length > 0 ? (
            <AuthorRail
              username={author.username}
              locale={locale}
              posts={posts}
              series={series}
              activeTag={activeTag}
            />
          ) : undefined
        }
      >
        <AuthorContentTransition>
        {activeTag && (
          // Active tag filter banner — names the scope (this author's posts under #tag) and offers a
          // clear, never sending the reader off to the global topic feed.
          <div className="mb-5 flex items-center gap-2 text-[14px]">
            <span className="text-slate-500 dark:text-slate-400">{t("tagFilterLabel")}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">#{activeTag}</span>
            <BlogLink
              href={authorHref(author.username, locale)}
              className="focus-ring ml-1 rounded text-[13px] font-medium text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
            >
              {t("tagFilterClear")}
            </BlogLink>
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-slate-500">{t("emptyPosts")}</p>
        ) : visiblePosts.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("tagFilterEmpty", { tag: activeTag ?? "" })}</p>
        ) : pinnedPosts.length > 0 ? (
          // 대표글 → 최근 글, each under a quiet label. The labels carry the top spacing, so no flushTop.
          <div className="space-y-9">
            <section>
              <RailHeading className="mb-3">{t("featuredPosts")}</RailHeading>
              <FeedList>
                {pinnedPosts.map((p) => (
                  <FeedCard key={p.slug} hideAuthor item={{ ...p, author, viewCount: 0 }} locale={locale} />
                ))}
              </FeedList>
            </section>
            {recentPosts.length > 0 && (
              <section>
                <RailHeading className="mb-3">{t("recentPosts")}</RailHeading>
                <FeedList>
                  {recentPosts.map((p) => (
                    <FeedCard key={p.slug} hideAuthor item={{ ...p, author, viewCount: 0 }} locale={locale} />
                  ))}
                </FeedList>
              </section>
            )}
          </div>
        ) : (
          // No pins → the plain list. Same card + wrapper as the feed; single-author surface so the
          // author is hidden. The first row gets flushTop so it sits tight under the tabs (with a tag
          // filter the banner leads, so don't flush).
          <FeedList>
            {visiblePosts.map((p, i) => (
              <FeedCard
                key={p.slug}
                hideAuthor
                flushTop={i === 0 && !activeTag}
                item={{ ...p, author, viewCount: 0 }}
                locale={locale}
              />
            ))}
          </FeedList>
        )}

        <footer className="mt-16 flex items-center justify-between border-t border-slate-100 pt-8 dark:border-slate-800">
          {/* Viral-loop badge — followable link back to kurl; on a custom-domain profile it's a real
              external backlink, elsewhere quiet brand exposure. */}
          <MadeWithKurl />
          <ReportButton subjectType="USER" subjectId={author.id} />
        </footer>
        </AuthorContentTransition>
      </ReadingShell>
    </>
  );
}
