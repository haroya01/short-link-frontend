"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  TOPICS_LIMIT,
  listTopicPosts,
  listTopics,
  type Topic,
  type TopicTarget,
} from "@/modules/notes/api/topics";
import { sameLink } from "./topics";
import { REMOTE_TRENDING_STALE_MS, type RemoteNotes } from "./use-remote-trending";

const TOPICS_KEY = ["explore", "topics"] as const;

export interface Topics {
  topics: Topic[];
  settled: boolean;
  loading: boolean;
  retry: () => void;
}

export function useTopics(limit = TOPICS_LIMIT, enabled = true): Topics {
  const { ready, authenticated } = useAuth();
  const query = useQuery({
    queryKey: [...TOPICS_KEY, limit, authenticated ? "member" : "anonymous"],
    queryFn: () => listTopics(limit),
    enabled: ready && enabled,
    staleTime: REMOTE_TRENDING_STALE_MS,
  });
  return {
    topics: query.data ?? [],
    settled: query.isSuccess || query.isError,
    loading: enabled && query.isFetching,
    retry: () => void query.refetch(),
  };
}

const NOTHING: RemoteNotes = {
  state: "ready",
  pages: [],
  hasMore: false,
  loadingMore: false,
  moreFailed: false,
  stalled: false,
  more: () => {},
};

function matches(topic: Topic, target: TopicTarget): boolean {
  if ("tag" in target) return topic.kind === "tag" && topic.tag.toLowerCase() === target.tag.toLowerCase();
  return topic.kind === "link" && sameLink(topic.url, target.url);
}

function useListedTopic(target: TopicTarget): Topic | null {
  const client = useQueryClient();
  for (const [, topics] of client.getQueriesData<Topic[]>({ queryKey: TOPICS_KEY })) {
    const found = topics?.find((topic) => matches(topic, target));
    if (found) return found;
  }
  return null;
}

export function useTopicPosts(target: TopicTarget): { notes: RemoteNotes; topic: Topic | null } {
  const { ready, authenticated } = useAuth();
  const listed = useListedTopic(target);
  const kind = "tag" in target ? "tag" : "url";
  const value = "tag" in target ? target.tag : target.url;
  const blank = value.trim() === "";
  const { data, isError, isFetchNextPageError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["notes", "topic-posts", kind, value, authenticated ? "member" : "anonymous"],
      queryFn: ({ pageParam }) => listTopicPosts(target, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.next,
      enabled: ready && !blank,
    });
  if (blank) return { topic: null, notes: NOTHING };
  if (data) {
    return {
      topic: data.pages[0]?.topic ?? null,
      notes: {
        state: "ready",
        pages: data.pages,
        hasMore: hasNextPage,
        loadingMore: isFetchingNextPage,
        moreFailed: isFetchNextPageError,
        stalled: false,
        more: () => void fetchNextPage({ cancelRefetch: false }),
      },
    };
  }
  if (isError) return { topic: listed, notes: { state: "failed", retry: () => void refetch() } };
  return { topic: listed, notes: { state: "loading" } };
}
