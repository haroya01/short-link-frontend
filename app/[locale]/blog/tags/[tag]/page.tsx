import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hash } from "lucide-react";
import { listFeedByTag } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)} · blog.kurl` };
}

export default async function TagFeedPage({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag } = await params;
  const decoded = decodeURIComponent(tag);
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  const result = await listFeedByTag(decoded, 0, 24);
  const items = result.ok ? result.data.items : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-center gap-2 border-b border-slate-200/80 pb-5">
        <Hash className="h-6 w-6 text-accent-600" />
        <h1 className="text-headline-sm font-bold tracking-tight text-slate-900">{decoded}</h1>
      </header>

      {items.length === 0 ? (
        <FeedEmpty title={t("emptyTagTitle")} />
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
