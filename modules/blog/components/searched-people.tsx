"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { searchPeople, searchablePeopleQuery, type PeoplePage, type PersonMatch } from "@/modules/blog/api/people";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { Avatar } from "./avatar";
import { BlogEmpty } from "./blog-empty";
import { BlogLink } from "./blog-link";
import { FollowButton } from "./follow-button";

export function SearchedPeople({ query }: { query: string }) {
  const t = useTranslations("publicFeed");
  const searchable = searchablePeopleQuery(query);
  const blocked = useBlockedNames();
  const { data, isLoading, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["people", "search", query],
    queryFn: ({ pageParam }) => searchPeople(query, pageParam),
    enabled: searchable,
    initialPageParam: 0,
    getNextPageParam: (last: PeoplePage) => (last.hasNext ? last.page + 1 : undefined),
  });

  if (!searchable) {
    return <BlogEmpty icon={UserRound} title={t("searchPeopleHint")} />;
  }
  if (isLoading) {
    return (
      <ul role="status" aria-busy="true" className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-3.5">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (isError) return <ErrorState title={t("searchFailed")} onRetry={() => void refetch()} />;

  const people = (data?.pages.flatMap((page) => page.items) ?? []).filter((p) => !blocked.has(p.username));
  if (people.length === 0) {
    return <BlogEmpty icon={Search} title={t("searchNoPeople")} />;
  }

  return (
    <div>
      <ul data-testid="people-results" className="divide-y divide-slate-100 dark:divide-slate-800">
        {people.map((person) => (
          <li key={person.username}>
            <PersonRow person={person} />
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="focus-ring rounded-surface border border-slate-300 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: PersonMatch }) {
  const locale = useLocale();
  const name = person.displayName?.trim() || person.username;
  return (
    <div data-testid={`person-${person.username}`} className="flex items-start gap-3 py-3.5">
      <BlogLink
        href={authorHref(person.username, locale)}
        className="focus-ring flex min-w-0 flex-1 items-start gap-3 rounded-surface"
      >
        <Avatar src={person.avatarUrl} name={name} seed={person.userId} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{name}</span>
          {name !== person.username && (
            <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">@{person.username}</span>
          )}
          {person.bio && (
            <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">
              {person.bio}
            </span>
          )}
        </span>
      </BlogLink>
      <div className="pt-1.5">
        <FollowButton
          username={person.username}
          initialFollowerCount={person.followerCount ?? 0}
          initialFollowing={person.following}
          initialRequested={person.requested}
          compact
          quiet
        />
      </div>
    </div>
  );
}
