import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { blogPath } from "@/lib/host";
import { NOTE_SHELVES, NotesFeed, type NoteShelf } from "@/modules/notes/components/notes-feed";

const HOME_SORT: Record<string, string | null> = {
  following: "following",
  everyone: "recent",
  trending: "trending",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notes" });
  return { title: `${t("title")} · kurl log`, robots: { index: false } };
}

export default async function NotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const feed = typeof query.feed === "string" ? query.feed : null;

  if (feed === "federated") redirect(`/${locale}${blogPath("/explore")}`);
  if (!(NOTE_SHELVES as readonly string[]).includes(feed ?? "")) {
    const forward = new URLSearchParams();
    const sort = feed ? HOME_SORT[feed] : null;
    if (sort) forward.set("sort", sort);
    for (const key of ["quote", "quoteTitle", "quoteSlug", "quoteAuthor"]) {
      const value = query[key];
      if (typeof value === "string") forward.set(key, value);
    }
    const rest = forward.toString();
    redirect(`/${locale}${blogPath(rest ? `/?${rest}` : "/")}`);
  }

  const listId = Number(query.list) || null;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Suspense>
        <NotesFeed shelf={feed as NoteShelf} listId={listId} />
      </Suspense>
    </div>
  );
}
