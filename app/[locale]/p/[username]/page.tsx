import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ReportButton } from "@/modules/blog/components/report-button";
import { AuthorHeader } from "./_components/author-header";
import { FeedCard } from "@/modules/blog/components/feed-card";
import { listPublicPosts } from "@/modules/blog/api/public-posts";

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
  const t = await getTranslations({ locale, namespace: "publicPost" });

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <AuthorHeader author={author} active="posts" />

      <div className="mt-8">
        {posts.length === 0 ? (
          <p className="text-slate-500">{t("emptyPosts")}</p>
        ) : (
          // Same card as the feed (forced row, single-author so no repeated author).
          <ul className="flex flex-col gap-3">
            {posts.map((p) => (
              <FeedCard
                key={p.slug}
                row
                hideAuthor
                item={{ ...p, author, viewCount: 0 }}
                locale={locale}
                labels={{ views: () => "" }}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-16 flex justify-end border-t border-slate-100 pt-8">
        <ReportButton subjectType="USER" subjectId={author.id} />
      </footer>
    </main>
  );
}
