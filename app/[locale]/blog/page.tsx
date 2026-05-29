import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PenSquare } from "lucide-react";
import { listPublicFeed, type FeedSort } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";
import { FollowingFeed } from "@/modules/blog/components/following-feed";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: `blog.kurl — ${t("title")}` };
}

export default async function BlogFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale } = await params;
  const { sort: sortParam } = await searchParams;
  // "following" is client-rendered (auth needed); recent/trending are server-fetched here.
  const tab: "recent" | "trending" | "following" =
    sortParam === "trending" || sortParam === "following" ? sortParam : "recent";
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  const result = tab === "following" ? null : await listPublicFeed(tab as FeedSort, 0, 24);
  const items = result && result.ok ? result.data.items : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <nav className="flex gap-1 text-[15px] font-bold">
          <SortTab label={t("recent")} href="?sort=recent" active={tab === "recent"} />
          <SortTab label={t("trending")} href="?sort=trending" active={tab === "trending"} />
          <SortTab label={t("feed")} href="?sort=following" active={tab === "following"} />
          <SortTab label={t("topics")} href="/tags" active={false} />
        </nav>
        <a
          href="/write"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          <PenSquare className="h-4 w-4" />
          {t("write")}
        </a>
      </header>

      {tab === "following" ? (
        <FollowingFeed locale={locale} />
      ) : items.length === 0 ? (
        <p className="mt-10 text-slate-400">{t("empty")}</p>
      ) : (
        <div className="mt-8">
          <FeedGrid>
            {items.map((item) => (
              <FeedCard
                key={`${item.author.username}/${item.slug}`}
                item={item}
                locale={locale}
                labels={{ views: (count) => t("views", { count }) }}
              />
            ))}
          </FeedGrid>
        </div>
      )}
    </main>
  );
}

function SortTab({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`relative px-2.5 py-1.5 transition-colors ${
        active
          ? "text-accent-700 after:absolute after:inset-x-2.5 after:-bottom-[17px] after:h-0.5 after:rounded-full after:bg-accent-600"
          : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
    </a>
  );
}
