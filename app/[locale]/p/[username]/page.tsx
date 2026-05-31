import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ReportButton } from "@/modules/blog/components/report-button";
import { AuthorHeader } from "./_components/author-header";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { AuthorRail } from "@/modules/blog/components/author-rail";
import { listPublicPosts, listPublicSeries } from "@/modules/blog/api/public-posts";

// 30s ISR — author 발행 후 30 초 내 visitors 반영. Backend 가 어차피 매번 직접 조회.
export const revalidate = 30;

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

function subdomainOrigin(req: ReadonlyHeaders, username: string): string {
  const host = req.get("x-original-host") ?? req.get("host");
  if (!host) return `https://${username}.kurl.me`;
  const cleaned = host.split(":")[0];
  return `https://${cleaned}`;
}

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
  const origin = subdomainOrigin(h, username);
  return {
    title: `@${author.username}`,
    description: author.bio ?? undefined,
    alternates: { canonical: `${origin}/` },
    openGraph: {
      title: `@${author.username}`,
      description: author.bio ?? undefined,
      url: `${origin}/`,
      images: author.avatarUrl ? [{ url: author.avatarUrl }] : undefined,
    },
  };
}

export default async function PublicProfileHomepage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();

  const { author, posts } = result.data;
  const seriesResult = await listPublicSeries(username);
  const series = seriesResult.ok ? seriesResult.data.series : [];
  const t = await getTranslations({ locale, namespace: "publicPost" });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      {/* Header on the centered reading column — same band as the feed/post. */}
      <div className="mx-auto max-w-2xl">
        <AuthorHeader author={author} active="posts" />
      </div>

      {/* Centered post list + author rail (series · tags · archive) in the right gutter — the
          blog-native structure that lives here, where it's author-scoped and meaningful. */}
      <div className="mx-auto mt-8 max-w-2xl xl:grid xl:max-w-7xl xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-10">
        <div className="xl:col-start-2">
          {posts.length === 0 ? (
            <p className="text-slate-500">{t("emptyPosts")}</p>
          ) : (
            // Same list card + wrapper as the feed; single-author surface so the author is hidden.
            <FeedList>
              {posts.map((p) => (
                <FeedCard
                  key={p.slug}
                  hideAuthor
                  item={{ ...p, author, viewCount: 0 }}
                  locale={locale}
                />
              ))}
            </FeedList>
          )}

          <footer className="mt-16 flex justify-end border-t border-slate-100 pt-8">
            <ReportButton subjectType="USER" subjectId={author.id} />
          </footer>
        </div>

        {posts.length > 0 && (
          <aside className="mt-12 hidden xl:col-start-3 xl:mt-0 xl:block">
            <div className="sticky top-20">
              <AuthorRail
                username={author.username}
                locale={locale}
                posts={posts}
                series={series}
              />
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
