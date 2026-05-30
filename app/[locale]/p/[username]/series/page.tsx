import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";
import { listPublicSeries } from "@/modules/blog/api/public-posts";
import { AuthorHeader } from "../_components/author-header";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Series · @${username}` };
}

export default async function PublicSeriesIndexPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicSeries(username);
  const t = await getTranslations({ locale, namespace: "publicPost" });
  if (!result.ok) notFound();

  const { author, series } = result.data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <AuthorHeader author={author} active="series" />

      <div className="mt-8">
        {series.length === 0 ? (
          <p className="text-slate-500">{t("seriesEmpty")}</p>
        ) : (
          <ul className="space-y-2">
          {series.map((s) => (
            <li key={s.slug}>
              <a
                href={`/series/${s.slug}`}
                className="group -mx-4 flex items-center gap-3 rounded-2xl px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                <Layers className="h-5 w-5 shrink-0 text-accent-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-slate-900 group-hover:text-accent-700">
                    {s.title}
                  </span>
                  <span className="text-[13px] text-slate-500">
                    {t("postCount", { count: s.postCount })}
                  </span>
                </span>
              </a>
            </li>
          ))}
          </ul>
        )}
      </div>
    </main>
  );
}
