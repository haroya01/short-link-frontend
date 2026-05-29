import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hash } from "lucide-react";
import { blogHref } from "@/lib/host";
import { listPopularTags } from "@/modules/blog/api/public-posts";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";

// Rendered per request (not prerendered at build): the popular-tags fetch needs the runtime API
// base, which isn't available during static generation.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  return { title: `${t("topics")} · blog.kurl` };
}

export default async function TagsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const result = await listPopularTags(100);
  const tags = result.ok ? result.data : [];

  // Weight the chip by how popular the tag is, so the cloud reads at a glance.
  const max = tags.reduce((m, x) => Math.max(m, x.count), 1);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-center gap-2 border-b border-slate-200/80 pb-5">
        <Hash className="h-6 w-6 text-accent-600" />
        <h1 className="text-headline-sm font-bold tracking-tight text-slate-900">{t("topics")}</h1>
      </header>

      {tags.length === 0 ? (
        <FeedEmpty title={t("empty")} />
      ) : (
        <ul className="mt-8 flex flex-wrap gap-2.5">
          {tags.map((tag) => {
            const strong = tag.count >= max * 0.66;
            const medium = !strong && tag.count >= max * 0.33;
            return (
              <li key={tag.tag}>
                <a
                  href={blogHref(`/tags/${encodeURIComponent(tag.tag)}`)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                    strong
                      ? "bg-accent-100 text-accent-800 hover:bg-accent-200 text-[15px]"
                      : medium
                        ? "bg-accent-50 text-accent-700 hover:bg-accent-100 text-[14px]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 text-[13px]"
                  }`}
                >
                  <span>{tag.tag}</span>
                  <span className="text-slate-400">{tag.count}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
