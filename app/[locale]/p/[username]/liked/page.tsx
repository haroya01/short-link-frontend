import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { LikedList } from "@/modules/blog/components/saved/liked-list";
import { AuthorHeader } from "../_components/author-header";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicPost" });
  return { title: `${t("tabLiked")} · @${username}`, robots: { index: false, follow: false } };
}

export default async function LikedPostsPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();
  const { author } = result.data;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <AuthorHeader author={author} active="liked" />
      </div>
      <ReadingShell className="mt-8">
        <AuthorContentTransition>
          <LikedList username={author.username} locale={locale} />
        </AuthorContentTransition>
      </ReadingShell>
    </main>
  );
}
