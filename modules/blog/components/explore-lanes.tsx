"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { listSuggestedAuthors } from "@/modules/blog/api/public-posts";
import { ExploreTopics, ExploreTopicsSkeleton } from "@/modules/blog/components/explore-topics";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SuggestedAuthorsList } from "@/modules/blog/components/suggested-authors-list";
import type { ExploreLane } from "@/modules/blog/lib/explore-lane";
import { FollowSuggestions } from "@/modules/notes/components/follow-suggestions";
import { RemoteFeed } from "@/modules/notes/components/remote-feed";
import { useRemoteNotes } from "@/modules/notes/lib/use-remote-trending";
import { useTopics } from "@/modules/notes/lib/use-topics";

const AUTHORS = 5;

export function ExploreLanePanel({ lane }: { lane: ExploreLane }) {
  return lane === "people" ? <PeopleLane /> : <TrendsLane />;
}

function TrendsLane() {
  const t = useTranslations("publicFeed");
  const { topics, settled } = useTopics();
  useRemoteNotes("trending");

  if (!settled) {
    return (
      <div data-testid="explore-trends">
        <ExploreTopicsSkeleton />
      </div>
    );
  }
  return (
    <div data-testid="explore-trends">
      {topics.length > 0 && (
        <>
          <ExploreTopics topics={topics} />
          <RailHeading id="explore-popular-posts" className="pt-8">
            {t("topicsPopularPosts")}
          </RailHeading>
        </>
      )}
      <RemoteFeed view="trending" />
    </div>
  );
}

function PeopleLane() {
  const authors = useQuery({
    queryKey: ["explore", "suggested-authors"],
    queryFn: () => listSuggestedAuthors(AUTHORS).then((found) => (found.ok ? found.data : [])),
    staleTime: 5 * 60_000,
  });
  return (
    <div data-testid="explore-people" className="pt-4">
      <FollowSuggestions className="mb-8" />
      <SuggestedAuthorsList authors={authors.data ?? []} className="-mx-2" />
    </div>
  );
}
