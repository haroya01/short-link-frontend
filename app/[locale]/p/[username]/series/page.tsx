import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Layers } from "lucide-react";
import { listPublicSeries } from "@/lib/api/public-posts";

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
      <a
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-accent-700"
      >
        <ArrowLeft className="h-4 w-4" />@{author.username}
      </a>

      <h1 className="mt-6 text-headline-sm font-bold tracking-tight text-slate-900">
        {t("seriesIndexTitle")}
      </h1>

      <div className="section-divider my-10" />

      {series.length === 0 ? (
        <p className="text-slate-400">{t("seriesEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {series.map((s) => (
            <li key={s.slug}>
              <a
                href={`/series/${s.slug}`}
                className="group -mx-4 flex items-center gap-3 rounded-2xl px-4 py-4 transition-colors hover:bg-slate-50"
              >
                <Layers className="h-5 w-5 shrink-0 text-accent-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-slate-900 group-hover:text-accent-700">
                    {s.title}
                  </span>
                  <span className="text-[13px] text-slate-400">
                    {t("postCount", { count: s.postCount })}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
