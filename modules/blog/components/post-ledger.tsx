import { DATE_LOCALE } from "@/lib/date";
import type { PublicPostListItem } from "@/modules/blog/api/public-posts";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { postHref } from "@/modules/blog/lib/author-href";

function seoulParts(iso: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * An author's writing as a dated archive — year headings, then "MM.DD  title" rows. The discovery
 * feeds keep FeedCard rows; a person's own page reads as their archive instead.
 */
export function PostLedger({
  posts,
  username,
  locale,
}: {
  posts: PublicPostListItem[];
  username: string;
  locale: string;
}) {
  const years = new Map<string, PublicPostListItem[]>();
  for (const post of posts) {
    const { year } = seoulParts(post.publishedAt);
    const bucket = years.get(year);
    if (bucket) bucket.push(post);
    else years.set(year, [post]);
  }
  const fullDate = new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? "ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10">
      {[...years.entries()].map(([year, items]) => (
        <section key={year} aria-labelledby={`ledger-${year}`}>
          <h2
            id={`ledger-${year}`}
            className="border-b border-slate-200 pb-2 text-[13px] font-semibold tabular-nums text-slate-500 dark:border-slate-800 dark:text-slate-400"
          >
            {year}
          </h2>
          <ol className="mt-1">
            {items.map((post) => {
              const { month, day } = seoulParts(post.publishedAt);
              return (
                <li key={post.id}>
                  <BlogLink
                    href={postHref(username, post.slug, locale)}
                    className="focus-ring group -mx-3 flex items-baseline gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <time
                      dateTime={post.publishedAt}
                      title={fullDate.format(new Date(post.publishedAt))}
                      className="w-11 shrink-0 text-[13px] tabular-nums text-slate-500 dark:text-slate-400"
                    >
                      {month}.{day}
                    </time>
                    <span className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                      {post.title}
                    </span>
                  </BlogLink>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
