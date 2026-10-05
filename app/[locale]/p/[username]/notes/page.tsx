import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { authorBaseUrl } from "@/modules/blog/lib/subdomain-origin";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { fetchAuthorNotes } from "@/modules/notes/api/notes";
import { AuthorNotes } from "@/modules/notes/components/author-notes";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const exists = await listPublicPosts(username);
  if (!exists.ok && exists.status === 404) notFound();
  const h = await headers();
  const url = `${authorBaseUrl(h, username)}/notes`;
  const t = await getTranslations({ locale, namespace: "notes" });
  const title = t("publicTitle", { username });
  return {
    title,
    alternates: { canonical: url },
    openGraph: { title, url, type: "website", siteName: `@${username}` },
  };
}

export default async function AuthorNotesPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { username } = await params;
  const result = await fetchAuthorNotes(username);
  if (!result.ok && result.status === 404) notFound();
  return (
    <AuthorContentTransition>
      <div className="mx-auto mt-2 max-w-2xl">
        <AuthorNotes username={username} initial={result.ok ? result.data : null} />
      </div>
    </AuthorContentTransition>
  );
}
