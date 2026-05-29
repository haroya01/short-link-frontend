import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hash } from "lucide-react";
import { listFeedByTag } from "@/modules/blog/api/public-posts";
import { FeedCard } from "@/modules/blog/components/feed-card";

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
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center gap-2">
        <Hash className="h-6 w-6 text-accent-600" />
        <h1 className="text-headline-sm font-bold tracking-tight text-slate-900">{decoded}</h1>
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
