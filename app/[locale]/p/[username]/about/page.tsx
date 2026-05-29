import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { AuthorHeader } from "../_components/author-header";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `About · @${username}` };
}

export default async function PublicAuthorAboutPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  const t = await getTranslations({ locale, namespace: "publicPost" });
  if (!result.ok) notFound();

  const { author, posts } = result.data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <AuthorHeader author={author} active="about" />

      <div className="mt-8 space-y-3 text-[15px] leading-relaxed text-slate-600">
        {author.bio ? (
          <p className="whitespace-pre-line">{author.bio}</p>
        ) : (
          <p className="text-slate-400">{t("aboutEmpty")}</p>
        )}
        <p className="text-[13px] text-slate-400">{t("postCount", { count: posts.length })}</p>
      </div>
    </main>
  );
}
