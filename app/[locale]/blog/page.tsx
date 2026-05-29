import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PenSquare } from "lucide-react";
import { listPublicFeed, type FeedSort } from "@/modules/blog/api/public-posts";
import { FeedCard } from "@/modules/blog/components/feed-card";

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
  const sort: FeedSort = sortParam === "trending" ? "trending" : "recent";
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  const result = await listPublicFeed(sort, 0, 24);
  const items = result.ok ? result.data.items : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <nav className="flex gap-1 text-[15px] font-semibold">
          <SortTab label={t("recent")} href="?sort=recent" active={sort === "recent"} />
          <SortTab label={t("trending")} href="?sort=trending" active={sort === "trending"} />
        </nav>
        <a
          href="/write"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          <PenSquare className="h-4 w-4" />
          {t("write")}
        </a>
      </header>

      <div className="section-divider my-8" />

      {items.length === 0 ? (
        <p className="text-slate-400">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <FeedCard
              key={`${item.author.username}/${item.slug}`}
              item={item}
              locale={locale}
              labels={{ views: (count) => t("views", { count }) }}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function SortTab({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
    </a>
  );
}
