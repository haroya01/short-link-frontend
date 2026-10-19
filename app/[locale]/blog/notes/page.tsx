import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { NotesFeed } from "@/modules/notes/components/notes-feed";
import { NoteListSkeleton } from "@/modules/notes/components/note-list";
import { FeedSwitcher } from "@/modules/blog/components/feed-switcher";
import { TrendingNoteTags } from "@/modules/notes/components/trending-note-tags";
import { TrendingNoteLinks } from "@/modules/notes/components/trending-note-links";
import { FollowSuggestions } from "@/modules/notes/components/follow-suggestions";
import { NOTES_SWITCHER } from "@/modules/blog/lib/feed-memory";

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
  const tFeed = await getTranslations({ locale, namespace: "publicFeed" });
  const tabLabel = { following: tFeed("feed"), everyone: tFeed("recent"), trending: tFeed("trending") };
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)] xl:gap-10">
      <div className="mx-auto max-w-2xl xl:col-start-2 xl:mx-0 xl:w-full xl:max-w-none">
        <h1 className="sr-only">{t("title")}</h1>
        <p className="sr-only">{t("pageIntro")}</p>
        <Suspense
          fallback={
            <div>
              <div className="mb-2">
                <FeedSwitcher
                  surface="notes"
                  tabs={NOTES_SWITCHER.map((key) => ({ key, label: tabLabel[key], href: `?feed=${key}`, active: false }))}
                />
              </div>
              <div aria-hidden className="h-[60px] border-b border-slate-100 dark:border-slate-800" />
              <NoteListSkeleton />
            </div>
          }
        >
          <NotesFeed />
        </Suspense>
      </div>
      <aside className="hidden xl:col-start-3 xl:block">
        <div className="sticky top-24">
          <TrendingNoteTags />
          <TrendingNoteLinks />
          <FollowSuggestions />
        </div>
      </aside>
    </div>
  );
}
