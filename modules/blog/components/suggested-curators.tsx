"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listSuggestedAuthors, type SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { RailHeading } from "@/modules/blog/components/rail-heading";

/**
 * Cold-start springboard — curators to follow, so the empty Following / For You / Connections surfaces
 * never dead-end. A brand-new reader (zero follows) is the #1 retention risk: without a forward action
 * they bounce. This is self-fetching (public endpoint), so any empty state can drop it in without
 * plumbing the list down from the server. Renders nothing until it has at least one curator (no empty
 * heading), and each row is a one-tap follow that immediately seeds the connection graph.
 */
export function SuggestedCurators({ locale, limit = 6 }: { locale: string; limit?: number }) {
  const t = useTranslations("publicFeed");
  const [authors, setAuthors] = useState<SuggestedAuthor[] | null>(null);

  useEffect(() => {
    let alive = true;
    listSuggestedAuthors(limit)
      .then((r) => alive && setAuthors(r.ok ? r.data : []))
      .catch(() => alive && setAuthors([]));
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!authors || authors.length === 0) return null;

  return (
    <div className="mx-auto mt-2 w-full max-w-md text-left">
      <RailHeading className="mb-3 justify-center">{t("railSuggestedAuthors")}</RailHeading>
      <ul className="space-y-1">
        {authors.map(({ author, postCount }) => (
          <li key={author.username} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <a
              href={authorHref(author.username, locale)}
              className="focus-ring group flex min-w-0 flex-1 items-center gap-3 rounded-lg"
            >
              <Avatar src={author.avatarUrl} name={author.username} size="md" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-100">
                  {author.username}
                </span>
                <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {t("railPostCount", { count: postCount })}
                </span>
              </span>
            </a>
            <FollowButton username={author.username} initialFollowerCount={0} showCount={false} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}
