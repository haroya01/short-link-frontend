import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { SmartShelf } from "@/modules/blog/components/saved/smart-shelf";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicPost" });
  return { title: `${t("tabBookmarks")} · @${username}`, robots: { index: false, follow: false } };
}

export default async function BookmarksPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();
  const { author } = result.data;

  // Header lives in the persistent layout (ProfileChrome) — this page renders only its content.
  return (
      <ReadingShell className="mt-8">
        <AuthorContentTransition>
          <SmartShelf username={author.username} locale={locale} />
        </AuthorContentTransition>
      </ReadingShell>
  );
}
