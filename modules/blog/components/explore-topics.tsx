"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SrLoading } from "@/modules/blog/components/sr-loading";
import { TOPICS_FULL_LIMIT, type Topic } from "@/modules/notes/api/topics";
import { noteTagHref } from "@/modules/notes/components/note-body";
import { TOPIC_ROWS, topicGroups, topicMeta, topicTitle, type TopicRow } from "@/modules/notes/lib/topics";
import { useTopics } from "@/modules/notes/lib/use-topics";

const META = "block truncate text-[13px] text-slate-500 dark:text-slate-400";

function topicHref(topic: Topic): string {
  if (topic.kind === "tag") return noteTagHref(topic.tag);
  return blogPath(`/notes/link?url=${encodeURIComponent(topic.url)}`);
}

export function ExploreTopics({ topics }: { topics: Topic[] }) {
  const t = useTranslations("publicFeed");
  const [asked, setAsked] = useState(false);
  const full = useTopics(TOPICS_FULL_LIMIT, asked);
  const expanded = asked && full.topics.length > 0;
  const groups = expanded ? topicGroups(full.topics, null) : topicGroups(topics);
  const list = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!expanded) return;
    list.current
      ?.querySelector<HTMLElement>(`[data-topic-rank="${TOPIC_ROWS + 1}"] a`)
      ?.focus({ preventScroll: true });
  }, [expanded]);

  const split = groups.own.length > 0 && groups.other.length > 0;
  return (
    <section ref={list} aria-labelledby="explore-topics-now" data-testid="explore-topics" className="pt-5">
      <RailHeading id="explore-topics-now">{t("topicsNow")}</RailHeading>
      <TopicRows rows={split ? groups.own : [...groups.own, ...groups.other]} />
      {split && (
        <>
          <RailHeading id="explore-topics-other" className="pt-6">
            {t("topicsOtherLanguages")}
          </RailHeading>
          <TopicRows rows={groups.other} labelledBy="explore-topics-other" />
        </>
      )}
      {groups.more && (
        <button
          type="button"
          data-testid="explore-topics-more"
          disabled={full.loading}
          onClick={() => (asked ? full.retry() : setAsked(true))}
          className="focus-ring touch-target ml-12 mt-1 inline-flex items-center rounded text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-60 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {full.loading ? t("loadingMore") : t("loadMore")}
        </button>
      )}
    </section>
  );
}

function TopicRows({ rows, labelledBy = "explore-topics-now" }: { rows: TopicRow[]; labelledBy?: string }) {
  const t = useTranslations("publicFeed");
  const locale = useLocale();
  if (rows.length === 0) return null;
  return (
    <ol
      start={rows[0].rank}
      aria-labelledby={labelledBy}
      className="mt-1 divide-y divide-slate-100 dark:divide-slate-800"
    >
      {rows.map(({ topic, rank }) => {
        const meta = topicMeta(topic, locale);
        return (
          <li key={topic.id} data-topic-rank={rank} data-topic-kind={topic.kind}>
            <BlogLink
              href={topicHref(topic)}
              className="focus-ring -mx-2 flex items-baseline gap-3 rounded-surface px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <span aria-hidden className="w-9 shrink-0 text-[13px] tabular-nums text-slate-500 dark:text-slate-400">
                {rank}
              </span>
              <span className="min-w-0 flex-1">
                {meta && (
                  <span data-topic-meta className={META}>
                    {meta}
                  </span>
                )}
                <span
                  lang={topic.language ?? undefined}
                  className="line-clamp-2 break-words text-[16px] font-semibold leading-snug text-slate-900 dark:text-slate-100"
                >
                  {topicTitle(topic)}
                </span>
                <span className={`mt-0.5 ${META}`}>{t("topicPeople", { count: topic.people })}</span>
              </span>
            </BlogLink>
          </li>
        );
      })}
    </ol>
  );
}

export function ExploreTopicsSkeleton() {
  return (
    <div aria-busy="true" data-testid="explore-topics-skeleton" className="pt-5">
      <SrLoading />
      <div className="h-[1lh] text-[13px]">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
      </div>
      <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-3 py-3">
            <div className="w-9 shrink-0">
              <div className="mt-1 h-3 w-3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
            </div>
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
