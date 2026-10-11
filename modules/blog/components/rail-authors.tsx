"use client";

import { useTranslations } from "next-intl";
import { listSuggestedAuthors, type SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useViewerList } from "@/modules/blog/lib/use-viewer-list";

/** The rail's suggested authors — the server's anonymous pick, then the signed-in reader's own. */
export function RailAuthors({
  locale,
  initial,
  limit,
}: {
  locale: string;
  initial: SuggestedAuthor[];
  limit: number;
}) {
  const t = useTranslations("publicFeed");
  const authors = useViewerList(
    initial,
    () => listSuggestedAuthors(limit).then((r) => (r.ok ? r.data : null)),
    String(limit),
  );
  if (authors.length === 0) return null;

  return (
    <section>
      <RailHeading className="mb-3">{t("railWriters")}</RailHeading>
      <ul className="flex flex-col gap-1">
        {authors.map(({ author, postCount }) => (
          <li key={author.username}>
            <BlogLink
              href={authorHref(author.username, locale)}
              className="group flex items-center gap-3 rounded-surface px-2 py-2 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/50"
            >
              <Avatar src={author.avatarUrl} name={author.displayName || author.username} seed={author.id} size="md" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-100">
                  {author.username}
                </span>
                <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {t("railPostCount", { count: postCount })}
                </span>
              </span>
            </BlogLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
