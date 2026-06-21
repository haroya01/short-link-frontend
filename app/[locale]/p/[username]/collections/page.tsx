import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CornerDownRight, FolderOpen } from "lucide-react";
import { blogPath } from "@/lib/host";
import {
  listKindredCurators,
  listPublicCollectionsByUsername,
} from "@/modules/blog/api/collections";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { AuthorContentTransition } from "@/modules/blog/components/author-content-transition";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { KindredCurators } from "@/modules/blog/components/kindred-curators";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Collections · @${username}` };
}

/**
 * The author's PUBLIC collections/paths — the curating facet of their identity (글/시리즈/컬렉션/소개).
 * Closes the connection-graph loop: arrive via a curator link, see the other paths they've woven.
 * Header (identity + tabs) is the persistent ProfileChrome; this renders only the content column.
 */
export default async function PublicCollectionsIndexPage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicPost" });
  const tc = await getTranslations({ locale, namespace: "collections" });
  const [collections, kindred] = await Promise.all([
    listPublicCollectionsByUsername(username),
    listKindredCurators(username),
  ]);

  return (
    <ReadingShell className="mt-8">
      <AuthorContentTransition>
        {collections.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("collectionsEmpty")}</p>
        ) : (
          // Quiet editorial index — same hairline-row spine as the series index, so 시리즈↔컬렉션 read
          // as siblings. A path gets the ↳ glyph; a plain collection the folder.
          <ol className="border-t border-slate-100 dark:border-slate-800/80">
            {collections.map((c) => (
              <li key={c.id} className="border-b border-slate-100 dark:border-slate-800/80">
                <BlogLink
                  href={blogPath(`/collections/${c.id}`)}
                  className="focus-ring group flex items-start gap-4 rounded-lg py-5"
                >
                  <span className="mt-1 shrink-0 text-accent-600 dark:text-accent-500">
                    {c.kind === "PATH" ? (
                      <CornerDownRight className="h-4 w-4" />
                    ) : (
                      <FolderOpen className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[18px] font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                      {c.title}
                    </span>
                    {c.description && (
                      <span className="mt-0.5 block line-clamp-1 text-[14px] text-slate-500 dark:text-slate-400">
                        {c.description}
                      </span>
                    )}
                    <span className="mt-1 block text-[13px] text-slate-400 dark:text-slate-500">
                      {c.kind === "PATH" ? `${tc("kindPath")} · ` : ""}
                      {tc("itemCount", { count: c.count })}
                    </span>
                  </span>
                </BlogLink>
              </li>
            ))}
          </ol>
        )}
        <KindredCurators
          curators={kindred}
          locale={locale}
          title={tc("kindredCuratorsTitle")}
          sharedLabel={(count) => tc("sharedItems", { count })}
        />
      </AuthorContentTransition>
    </ReadingShell>
  );
}
