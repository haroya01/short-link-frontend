import type { KindredCurator } from "@/modules/blog/api/collections";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";

/**
 * 취향이 겹치는 큐레이터 — this curator and the people who wove some of the SAME blocks into their own
 * public collections. Connection by what-you-curate, not by follows (the Are.na thesis). Quiet
 * hairline rows like the collections index, so it reads as a sibling section, not a recommendation ad.
 * Renders nothing when there's no overlap (no empty-state noise on the page).
 */
export function KindredCurators({
  curators,
  locale,
  title,
  sharedLabel,
}: {
  curators: KindredCurator[];
  locale: string;
  title: string;
  /** Per-curator overlap label, e.g. "{count}개 함께 엮음" — built by the page with its translations. */
  sharedLabel: (count: number) => string;
}) {
  if (curators.length === 0) return null;
  return (
    <section className="mt-12 border-t border-slate-100 pt-6 dark:border-slate-800/80">
      <RailHeading>{title}</RailHeading>
      <ul className="mt-3">
        {curators.map(({ curator, sharedItems }) => (
          <li key={curator.id}>
            <BlogLink
              href={authorHref(curator.username, locale)}
              className="focus-ring group flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <Avatar src={curator.avatarUrl} name={curator.username} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                  @{curator.username}
                </span>
                {curator.bio && (
                  <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">
                    {curator.bio}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">
                {sharedLabel(sharedItems)}
              </span>
            </BlogLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
