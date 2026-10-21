"use client";

import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listPublicFeed, listSuggestedAuthors } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { HomePostRow } from "@/modules/blog/components/home-post-row";
import { BelongingProvider } from "@/modules/blog/components/post-belonging-context";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SuggestedAuthorsList } from "@/modules/blog/components/suggested-authors-list";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { listFollowSuggestions } from "@/modules/notes/api/follow-suggestions";
import { FollowSuggestions } from "@/modules/notes/components/follow-suggestions";
import { NoteListSkeleton } from "@/modules/notes/components/note-list";
import { RemoteFeed } from "@/modules/notes/components/remote-feed";

export type ExploreLane = "picks" | "remote" | "people";

const PICKS = 10;
const STRIP_AFTER = 3;
const STRIP_MAX = 8;
const AUTHORS = 5;

export function ExploreLanePanel({ lane, onPeople }: { lane: ExploreLane; onPeople: () => void }) {
  if (lane === "remote") return <RemoteFeed view="latest" />;
  if (lane === "people") return <PeopleLane />;
  return <PicksLane onPeople={onPeople} />;
}

function useSuggestedAuthors(enabled: boolean) {
  return useQuery({
    queryKey: ["explore", "suggested-authors"],
    queryFn: () => listSuggestedAuthors(AUTHORS).then((found) => (found.ok ? found.data : [])),
    enabled,
    staleTime: 5 * 60_000,
  });
}

function PicksLane({ onPeople }: { onPeople: () => void }) {
  const t = useTranslations("publicFeed");
  const blocked = useBlockedNames();
  const posts = useQuery({
    queryKey: ["explore", "trending-posts"],
    queryFn: async () => {
      const found = await listPublicFeed("trending", 0, PICKS);
      if (!found.ok) throw new Error(String(found.status));
      return found.data.items;
    },
    staleTime: 5 * 60_000,
  });
  const items = (posts.data ?? []).filter((post) => !blocked.has(post.author.username)).slice(0, PICKS);
  const stripAt = Math.min(STRIP_AFTER, items.length) - 1;

  return (
    <div data-testid="explore-picks">
      {posts.isPending ? (
        <NoteListSkeleton rows={3} />
      ) : posts.isError ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-4 text-[14px] text-slate-500 dark:text-slate-400">
          <span>{t("loadMoreError")}</span>
          <button
            type="button"
            onClick={() => void posts.refetch()}
            className="focus-ring rounded font-medium text-slate-900 hover:underline dark:text-slate-100"
          >
            {t("retry")}
          </button>
        </p>
      ) : null}
      <BelongingProvider>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((post, i) => (
            <Fragment key={post.id}>
              <HomePostRow post={post} />
              {i === stripAt && <PeopleStrip onMore={onPeople} />}
            </Fragment>
          ))}
          {!posts.isPending && items.length === 0 && <PeopleStrip onMore={onPeople} />}
        </div>
      </BelongingProvider>
      <div className="border-t border-slate-100 dark:border-slate-800">
        <RemoteFeed view="trending" />
      </div>
    </div>
  );
}

function PeopleStrip({ onMore }: { onMore: () => void }) {
  const t = useTranslations("publicFeed");
  const tNotes = useTranslations("notes");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const suggestions = useQuery({
    queryKey: ["explore", "follow-suggestions"],
    queryFn: listFollowSuggestions,
    enabled: ready && authenticated,
    staleTime: 60_000,
  });
  const fallback = ready && (!authenticated || (suggestions.isSuccess && suggestions.data.length === 0) || suggestions.isError);
  const authors = useSuggestedAuthors(fallback);

  const people =
    authenticated && suggestions.data && suggestions.data.length > 0
      ? suggestions.data.map((pick) => ({
          username: pick.username,
          name: pick.displayName || pick.username,
          avatarUrl: pick.avatarUrl,
          reason: pick.reason === "FRIENDS" ? tNotes("suggestionsFriends", { count: pick.mutuals }) : tNotes("suggestionsPopular"),
          following: false as boolean | undefined,
        }))
      : fallback
        ? (authors.data ?? []).map(({ author, postCount }) => ({
            username: author.username,
            name: author.displayName || author.username,
            avatarUrl: author.avatarUrl,
            reason: t("railPostCount", { count: postCount }),
            following: undefined,
          }))
        : [];
  if (people.length === 0) return null;

  return (
    <section aria-labelledby="explore-people-strip" data-testid="explore-people-strip" className="py-5">
      <div className="flex items-center justify-between gap-3">
        <RailHeading id="explore-people-strip">{tNotes("suggestionsTitle")}</RailHeading>
        <button
          type="button"
          onClick={onMore}
          className="focus-ring touch-target inline-flex items-center gap-0.5 rounded text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {t("exploreMorePeople")}
          <ChevronRight aria-hidden strokeWidth={2.5} className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="-mx-4 mt-3 flex snap-x gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {people.slice(0, STRIP_MAX).map((person) => (
          <li
            key={person.username}
            data-testid={`explore-person-${person.username}`}
            className="flex w-[140px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-surface border border-slate-200 bg-white px-2.5 pb-3.5 pt-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <BlogLink
              href={authorHref(person.username, locale)}
              className="focus-ring flex w-full min-w-0 flex-col items-center gap-1.5 rounded-surface text-center"
            >
              <Avatar src={person.avatarUrl} name={person.name} handle={person.username} size="card" />
              <span className="mt-0.5 w-full truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                {person.name}
              </span>
              <span className="line-clamp-2 h-8 text-[12px] leading-4 text-slate-500 dark:text-slate-400">{person.reason}</span>
            </BlogLink>
            <FollowButton username={person.username} initialFollowerCount={0} initialFollowing={person.following} compact quiet />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PeopleLane() {
  const authors = useSuggestedAuthors(true);
  return (
    <div data-testid="explore-people" className="pt-4">
      <FollowSuggestions className="mb-8" />
      <SuggestedAuthorsList authors={authors.data ?? []} className="-mx-2" />
    </div>
  );
}
