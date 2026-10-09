import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { authorBaseUrl } from "@/modules/blog/lib/subdomain-origin";
import { authorHref } from "@/modules/blog/lib/author-href";
import { findPublicSeries } from "@/modules/blog/api/public-posts";
import { noteSeriesNav, seriesEntries, seriesEpisodes } from "@/modules/blog/lib/series-items";
import { SeriesNav } from "@/modules/blog/components/series-nav";
import { SeriesNext } from "@/modules/blog/components/series-next";
import { SeriesSwipe } from "@/modules/blog/components/series-swipe";
import { fetchNoteThread } from "@/modules/notes/api/notes";
import { NoteThreadView } from "@/modules/notes/components/note-thread";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; username: string; id: string }>;

async function load(id: string) {
  const noteId = Number(id);
  if (!Number.isInteger(noteId) || noteId <= 0) notFound();
  const result = await fetchNoteThread(noteId);
  if (!result.ok) {
    if (result.status === "error") throw new Error(`note fetch failed: ${noteId}`);
    notFound();
  }
  return result.data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, username, id } = await params;
  const thread = await load(id);
  const t = await getTranslations({ locale, namespace: "notes" });
  const h = await headers();
  const url = `${authorBaseUrl(h, thread.note.author.username)}/notes/${thread.note.id}`;
  const title = t("noteBy", { username: thread.note.author.username });
  const description = thread.note.body.slice(0, 160) || undefined;
  const image = thread.note.media[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: `@${username}`,
      images: image ? [{ url: image, alt: thread.note.media[0]?.altText ?? "" }] : undefined,
    },
  };
}

export default async function NotePage({ params }: { params: Params }) {
  const { locale, username, id } = await params;
  const thread = await load(id);
  if (thread.note.author.username !== username) {
    permanentRedirect(authorHref(thread.note.author.username, locale, `notes/${thread.note.id}`));
  }
  const author = thread.note.author.username;
  const series = thread.series ? noteSeriesNav(thread.series) : null;
  const episodes = series
    ? await findPublicSeries(author, series.slug).then((r) =>
        r.ok ? seriesEpisodes(seriesEntries(r.data), author, locale) : [],
      )
    : [];
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
      <SeriesSwipe series={series ?? undefined} username={author} locale={locale}>
        <NoteThreadView
          initial={thread}
          seriesBanner={
            series && (
              <SeriesNav
                series={series}
                episodes={episodes}
                currentKey={`notes/${thread.note.id}`}
                username={author}
                locale={locale}
              />
            )
          }
          seriesNext={
            series && <SeriesNext series={series} username={author} locale={locale} className="mb-8 mt-6" />
          }
        />
      </SeriesSwipe>
    </main>
  );
}
