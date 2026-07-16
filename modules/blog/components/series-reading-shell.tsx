"use client";

import { DATE_LOCALE } from "@/lib/date";
import { useMemo, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PublicPostListItem } from "@/modules/blog/api/public-posts";
import { postHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { CoverThumb } from "@/modules/blog/components/cover-thumb";
import { SeriesIndex } from "@/modules/blog/components/series-index";
import { FeedCardBookmark } from "@/modules/blog/components/feed-card-bookmark";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { showLikes } from "@/modules/blog/lib/public-metrics";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";

// Cap the tag cloud so a wide-ranging series doesn't fill the rail with chips; the rest expand on tap.
const TAG_CAP = 12;

type Filter = { kind: "tag"; value: string } | { kind: "month"; value: string } | null;

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * The series detail body: a centered episode list with the author card on the left and, on the right,
 * the same rail grammar as the author home — a **태그** chip set and a month **아카이브** — except here
 * both are interactive *filters*. Picking a tag narrows the run to that thread; picking a month narrows
 * it to what was published then. The two share one axis (selecting one clears the other; re-clicking
 * clears), and filtering is client-side + instant — the posts already carry tags + dates, nothing to
 * fetch. Episode numbers stay the post's real series position, and the list re-cascades on each change.
 *
 * Client-orchestrated (not the page's server ReadingShell) because the right-rail chips and the list
 * share the same filter state — they have to live under one stateful parent.
 */
export function SeriesReadingShell({
  leftRail,
  header,
  posts,
  username,
  locale,
}: {
  /** Server-rendered author card (avatar · follow · all-series), held in the left gutter. */
  leftRail: ReactNode;
  /** Server-rendered series header (eyebrow · title · subscribe · author), above the list. */
  header: ReactNode;
  posts: PublicPostListItem[];
  username: string;
  locale: string;
}) {
  const t = useTranslations("publicPost");
  const tf = useTranslations("publicFeed");
  const [filter, setFilter] = useState<Filter>(null);
  const [tagsOpen, setTagsOpen] = useState(false);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    timeZone: "Asia/Seoul",
  });

  // Tags this series uses, most-common first (then first-seen) — same ordering as the author rail.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const p of posts) {
      for (const tag of p.tags) {
        if (!isDisplayableTag(tag)) continue; // skip junk tags (incomplete jamo, single-char, mash)
        if (!counts.has(tag)) order.push(tag);
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return order
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
      .map((tag) => [tag, counts.get(tag) ?? 0] as const);
  }, [posts]);

  // Month archive grouped by year (chronological): each year is a quiet header line, its months listed
  // below as the clickable filters. Grouping (vs. a year prefix on every row) keeps the months in one
  // clean column and reads far better than "2026년 · 5월 · 3" strung across one row.
  const archive = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(monthKey(p.publishedAt), (counts.get(monthKey(p.publishedAt)) ?? 0) + 1);
    const flat = [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const groups: { year: string; sample: string; items: { key: string; count: number }[] }[] = [];
    for (const [key, count] of flat) {
      const year = key.slice(0, 4);
      let g = groups[groups.length - 1];
      if (!g || g.year !== year) {
        g = { year, sample: key, items: [] };
        groups.push(g);
      }
      g.items.push({ key, count });
    }
    return groups;
  }, [posts]);

  // Pin the real episode number before filtering, so a narrowed view keeps the series positions.
  const rows = posts
    .map((p, i) => ({ post: p, n: i + 1 }))
    .filter((r) =>
      !filter
        ? true
        : filter.kind === "tag"
          ? r.post.tags.includes(filter.value)
          : monthKey(r.post.publishedAt) === filter.value,
    );

  const isActive = (f: NonNullable<Filter>) => filter?.kind === f.kind && filter.value === f.value;
  const toggle = (f: NonNullable<Filter>) => setFilter((cur) => (cur?.kind === f.kind && cur.value === f.value ? null : f));
  const filterKey = filter ? `${filter.kind}:${filter.value}` : "all";

  // Tag chip — replicates the TagChip recipe exactly so it reads identically to the author rail, but
  // as a button (client filter, no nav). Count hidden on the active chip, like TagChip.
  const chipCls = (active: boolean) =>
    cn(
      "focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
      active
        ? "bg-accent-700 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400",
    );
  const renderTagChip = ([tag, count]: readonly [string, number]) => {
    const active = isActive({ kind: "tag", value: tag });
    return (
      <li key={tag}>
        <button
          type="button"
          onClick={() => toggle({ kind: "tag", value: tag })}
          aria-pressed={active}
          className={chipCls(active)}
        >
          <span>{tag}</span>
          {!active && <span className="text-slate-600 dark:text-slate-400">{count}</span>}
        </button>
      </li>
    );
  };

  // Year/month shown separately so the months line up in their own column (the year sits in a fixed-
  // width slot, printed only when it changes) — otherwise "2026년 1월" and "2월" start at different x.
  const yearStr = (key: string) =>
    new Date(Number(key.slice(0, 4)), 0, 1).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
    timeZone: "Asia/Seoul",
  });
  const monthStr = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", { month: "long", timeZone: "Asia/Seoul" });
  };

  const rail = (
    <div className="flex flex-col gap-6">
      {tags.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("railTags")}</RailHeading>
          <ul className="flex flex-wrap gap-2">{tags.slice(0, TAG_CAP).map(renderTagChip)}</ul>
          {tags.length > TAG_CAP && (
            <>
              {/* The overflow chips animate open/closed via the grid 0fr↔1fr trick (height auto, both
                  directions, no measured pixels). overflow-hidden clips them while collapsed. */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  tagsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="flex flex-wrap gap-2 pt-2">{tags.slice(TAG_CAP).map(renderTagChip)}</ul>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTagsOpen((o) => !o)}
                aria-expanded={tagsOpen}
                className="focus-ring mt-2 rounded text-[12px] font-medium text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-400"
              >
                {tagsOpen ? tf("seriesTagsLess") : tf("seriesTagsMore", { count: tags.length - TAG_CAP })}
              </button>
            </>
          )}
        </section>
      )}

      {archive.length > 0 && (
        <section>
          <RailHeading className="mb-3">{t("railArchive")}</RailHeading>
          <ul className="flex flex-col gap-3">
            {archive.map((group) => (
              <li key={group.year}>
                {/* Year header line — quiet, non-interactive; its months are the filters below it. */}
                <p className="mb-1 px-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {yearStr(group.sample)}
                </p>
                <ul className="flex flex-col gap-0.5 text-[13px]">
                  {group.items.map(({ key, count }) => {
                    const active = isActive({ kind: "month", value: key });
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggle({ kind: "month", value: key })}
                          aria-pressed={active}
                          className={cn(
                            "focus-ring flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors",
                            active
                              ? "bg-accent-50 font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50",
                          )}
                        >
                          <span>{monthStr(key)}</span>
                          <span className={active ? "" : "text-slate-500"}>{count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  // Asymmetric 3-column layout (so NOT the generic ReadingShell): the two rails anchor to different
  // things. The LEFT rail is author identity — a byline in the margin — so it top-aligns with the
  // title (row 1, the masthead). The RIGHT rail is the 태그/아카이브 *filters* that act on the episode
  // list, so it aligns with the list (row 2). The left rail spans both rows so its height never forces
  // a gap between the header and the list. Below xl this collapses to the centered column, rails drop.
  return (
    <div className="mx-auto max-w-2xl xl:grid xl:max-w-7xl xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-x-10">
      <div className="xl:col-start-2 xl:row-start-1">
        {header}
        <div className="section-divider mt-6 mb-5" />
      </div>

      <aside className="hidden xl:col-start-1 xl:row-start-1 xl:row-span-2 xl:block">
        <div className="sticky top-20">{leftRail}</div>
      </aside>

      <div className="xl:col-start-2 xl:row-start-2">
        {rows.length === 0 ? (
        <p className="py-6 text-[14px] text-slate-500 dark:text-slate-400">{tf("seriesFilterNone")}</p>
      ) : (
        // Re-keyed on the active filter so the whole list remounts and the cascade replays on each change.
        <ol key={filterKey} className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map(({ post: p, n }, i) => {
            const hasImage = Boolean(p.ogImageUrl);
            return (
              <li
                key={p.slug}
                className="profile-fade group group/row relative"
                style={{ ["--idx" as string]: i } as React.CSSProperties}
              >
                <BlogLink
                  href={postHref(username, p.slug, locale)}
                  className="-mx-3 flex items-start gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50 focus-ring dark:hover:bg-slate-800/40 sm:gap-4"
                >
                  <SeriesIndex n={n} className="mt-1 shrink-0 text-[14px]" />
                  {/* No-image rows reserve a right gutter so the title never runs under the save toggle. */}
                  <span className={`min-w-0 flex-1 ${hasImage ? "" : "pr-9"}`}>
                    <span className="block text-[17px] font-semibold leading-snug text-slate-900 transition-colors group-hover/row:text-accent-700 dark:text-slate-100 dark:group-hover/row:text-accent-400">
                      {p.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                      <time dateTime={p.publishedAt}>{fmtDate(p.publishedAt)}</time>
                      {showLikes(p.likeCount) && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-accent-600" />
                            {p.likeCount}
                          </span>
                        </>
                      )}
                    </span>
                    {p.excerpt && (
                      <span className="mt-1.5 line-clamp-2 block text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {p.excerpt}
                      </span>
                    )}
                  </span>
                  {hasImage && (
                    <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-24 sm:w-32">
                      <CoverThumb
                        src={p.ogImageUrl as string}
                        sizes="(min-width: 640px) 128px, 80px"
                        className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease)] group-hover/row:scale-[1.03] motion-reduce:transform-none"
                      />
                    </span>
                  )}
                </BlogLink>
                {/* Save toggle — sibling of the post link (never nested), pinned to the row's top-right. */}
                <div className="absolute right-3 top-4 z-10">
                  <FeedCardBookmark postId={p.id} username={username} slug={p.slug} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      </div>

      <aside className="mt-12 hidden xl:col-start-3 xl:row-start-2 xl:mt-0 xl:block">
        <div className="sticky top-20">{rail}</div>
      </aside>
    </div>
  );
}
