import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { NotesFeed } from "@/modules/notes/components/notes-feed";

const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ??
  (process.env.NEXT_PUBLIC_BLOG_HOST
    ? `https://${process.env.NEXT_PUBLIC_BLOG_HOST}`
    : "https://blog.kurl.me");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notes" });
  const title = `${t("title")} · kurl log`;
  const description = t("pageIntro");
  const url = `${BLOG_URL}/${locale}/notes`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}/notes`])),
        "x-default": `${BLOG_URL}/${routing.defaultLocale}/notes`,
      },
    },
    openGraph: { title, description, url, type: "website", siteName: "kurl log" },
  };
}

export default async function NotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "notes" });
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("pageIntro")}
        </p>
        <div className="mt-6">
          <Suspense>
            <NotesFeed />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
