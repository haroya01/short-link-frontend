import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Layers } from "lucide-react";
import { findPublicSeries } from "@/modules/blog/api/public-posts";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";

// Always render fresh — same reasoning as the post detail page: never serve a stale 404 for a
// just-published series. findPublicSeries fetches no-store to match.
export const dynamic = "force-dynamic";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await findPublicSeries(username, slug);
  if (!result.ok) return { title: `@${username}` };
  return { title: `${result.data.series.title} · @${result.data.author.username}` };
}

export default async function PublicSeriesPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;
  const result = await findPublicSeries(username, slug);
  const t = await getTranslations({ locale, namespace: "publicPost" });
  if (!result.ok) notFound();

  const { author, series, posts } = result.data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <a
        href={authorHref(username, locale, "series")}
        className="inline-flex items-center gap-1.5 rounded text-sm text-slate-500 transition-colors hover:text-accent-700 focus-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("tabSeries")}
      </a>

      <header className="mt-6 flex items-center gap-3">
        <Layers className="h-6 w-6 text-accent-600" />
        <div>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 sm:text-headline-md">
            {series.title}
          </h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            {t("postCount", { count: series.postCount })}
          </p>
        </div>
      </header>

      <div className="section-divider my-10" />

      <ol className="space-y-2">
        {posts.map((p, i) => (
          <li key={p.slug}>
            <a
              href={postHref(author.username, p.slug, locale)}
              className="group -mx-4 flex items-start gap-4 rounded-2xl px-4 py-4 transition-colors hover:bg-slate-50 focus-ring"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-50 text-[13px] font-semibold text-accent-700">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-accent-700">
                  {p.title}
                </span>
                {p.excerpt && (
                  <span className="mt-1 line-clamp-2 block text-[14px] leading-relaxed text-slate-500">
                    {p.excerpt}
                  </span>
                )}
                <time
                  dateTime={p.publishedAt}
                  className="mt-2 block text-[12px] text-slate-400"
                >
                  {new Date(p.publishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
