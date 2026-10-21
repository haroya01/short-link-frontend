"use client";

import { useLocale, useTranslations } from "next-intl";
import type { SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/lib/author-href";
import { Avatar } from "@/modules/blog/components/avatar";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { AuthorName } from "@/modules/blog/components/author-name";

export function SuggestedAuthorsList({
  authors,
  onNavigate,
  className,
}: {
  authors: SuggestedAuthor[];
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations("publicFeed");
  const locale = useLocale();
  if (authors.length === 0) return null;
  return (
    <section data-testid="explore-writers" className={className}>
      <RailHeading className="mb-1 px-2">{t("railWriters")}</RailHeading>
      <ul>
        {authors.map(({ author, postCount }) => (
          <li key={author.username} className="flex items-center gap-3 px-2 py-2">
            <a
              href={authorHref(author.username, locale)}
              onClick={onNavigate}
              className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-surface"
            >
              <Avatar src={author.avatarUrl} name={author.displayName || author.username} handle={author.username} size="md" />
              <span className="flex min-w-0 flex-col">
                <AuthorName
                  name={author.displayName}
                  handle={author.username}
                  className="text-[14px] font-semibold text-slate-800 dark:text-slate-200"
                />
                <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {t("railPostCount", { count: postCount })}
                </span>
              </span>
            </a>
            <FollowButton username={author.username} initialFollowerCount={0} compact quiet />
          </li>
        ))}
      </ul>
    </section>
  );
}
