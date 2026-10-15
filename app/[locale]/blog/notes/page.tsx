import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { NotesFeed } from "@/modules/notes/components/notes-feed";
import { TrendingNoteTags } from "@/modules/notes/components/trending-note-tags";
import { TrendingNoteLinks } from "@/modules/notes/components/trending-note-links";
import { FollowSuggestions } from "@/modules/notes/components/follow-suggestions";
import { NOTES_FEED_COOKIE, rememberedNotesFeed } from "@/modules/blog/lib/feed-memory";

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
  const savedFeed = rememberedNotesFeed(cookies().get(NOTES_FEED_COOKIE)?.value);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:py-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)_minmax(0,1fr)] xl:gap-10">
      <div className="mx-auto max-w-2xl xl:col-start-2 xl:mx-0 xl:w-full xl:max-w-none">
        <h1 className="sr-only">{t("title")}</h1>
        <p className="sr-only">{t("pageIntro")}</p>
        <Suspense>
          <NotesFeed savedFeed={savedFeed} />
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
