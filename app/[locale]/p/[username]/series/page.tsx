import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";
import { authorBaseUrl } from "@/modules/blog/lib/subdomain-origin";
import { authorHref } from "@/modules/blog/components/feed-card";
import { SeriesIndex } from "@/modules/blog/components/series-index";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { BlogLink } from "@/modules/blog/components/blog-link";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  // 존재하지 않는 작가는 여기서 404 를 확정한다 — 페이지의 notFound() 만으로는 레이아웃 스트리밍이
  // 먼저 커밋돼 HTTP 200 으로 나가는 soft-404 가 된다(같은 이유는 [slug]/page.tsx 참조). listPublicPosts
  // 는 cache() 라 레이아웃 헤더 조회와 dedupe 된다(추가 요청 없음).
  const exists = await listPublicPosts(username);
  if (!exists.ok && exists.status === 404) notFound();
  const h = await headers();
  const url = `${authorBaseUrl(h, username)}/series`;
  const title = `Series · @${username}`;
  return {
    title,
    alternates: { canonical: url },
    openGraph: { title, url, type: "website", siteName: `@${username}` },
  };
}

export default async function PublicSeriesIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale, username } = await params;
  const { tag: rawTag } = await searchParams;
  const result = await listPublicSeries(username);
  const t = await getTranslations({ locale, namespace: "publicPost" });
  if (!result.ok) notFound();

  const { author, series } = result.data;
  const seriesHome = authorHref(username, locale, "series");

  // ItemList of the author's series — a collection signal for this index (each entry → its series URL).
  const h = await headers();
  const origin = authorBaseUrl(h, username);
  const seriesListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Series · @${author.username}`,
    numberOfItems: series.length,
    itemListElement: series.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${origin}/series/${s.slug}`,
      name: s.title,
    })),
  };

  // Tag filter is series-scoped: it narrows THIS author's series by the tags their member posts carry
  // (the backend aggregates them onto each series). Counts = how many series sit under each tag.
  const activeTag = rawTag?.trim() || undefined;
  const tagCounts = new Map<string, number>();
  for (const s of series) {
    for (const tag of s.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()].sort((a, b) =>
    b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const tagHref = (tag: string) =>
    tag === activeTag ? seriesHome : `${seriesHome}?tag=${encodeURIComponent(tag)}`;

  const visibleSeries = activeTag
    ? series.filter((s) => (s.tags ?? []).includes(activeTag))
    : series;

  // Header lives in the persistent layout (ProfileChrome) — this page renders only its content.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesListJsonLd) }}
      />
      <ReadingShell
        className="mt-8"
        rail={
          tags.length > 0 ? (
            <section>
              <RailHeading className="mb-3">{t("railTags")}</RailHeading>
              <ul className="flex flex-wrap gap-2">
                {tags.map(([tag, count]) => (
                  <li key={tag}>
                    <TagChip
                      href={tagHref(tag)}
                      label={tag}
                      count={count}
                      active={tag === activeTag}
                      ariaCurrent={tag === activeTag ? "true" : undefined}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : undefined
        }
      >
        <AuthorContentTransition>
        {activeTag && (
          // Active tag filter banner — names the scope (this author's series under #tag) and offers a
          // clear back to the full series index.
          <div className="mb-5 flex items-center gap-2 text-[14px]">
            <span className="text-slate-500 dark:text-slate-400">{t("tagFilterLabel")}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">#{activeTag}</span>
            <BlogLink
              href={seriesHome}
              className="focus-ring ml-1 rounded text-[13px] font-medium text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
            >
              {t("tagFilterClear")}
            </BlogLink>
          </div>
        )}

        {series.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("seriesEmpty")}</p>
        ) : visibleSeries.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">
            {t("seriesTagFilterEmpty", { tag: activeTag ?? "" })}
          </p>
        ) : (
          // Numbered editorial index — a quiet table of contents of the author's series. The mono index
          // and hairline dividers read as a weblog's spine rather than a boxed card grid; the arrow
          // slides on hover as the affordance. Numbers track the visible (filtered) order.
          <ol className="border-t border-slate-100 dark:border-slate-800/80">
            {visibleSeries.map((s, i) => (
              <li
                key={s.slug}
                className="border-b border-slate-100 dark:border-slate-800/80"
              >
                <BlogLink
                  href={authorHref(username, locale, `series/${s.slug}`)}
                  className="focus-ring group flex items-center gap-5 rounded-lg py-5"
                >
                  <SeriesIndex n={i + 1} className="text-[13px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[18px] font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">
                      {t("postCount", { count: s.postCount })}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-accent-600 dark:text-slate-600 dark:group-hover:text-accent-400" />
                </BlogLink>
              </li>
            ))}
          </ol>
        )}
        </AuthorContentTransition>
      </ReadingShell>
    </>
  );
}
