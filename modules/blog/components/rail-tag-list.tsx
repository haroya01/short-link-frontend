import { BlogLink } from "@/modules/blog/components/blog-link";

/**
 * A rail's tag filter as `#tag count` text links. The active tag is set in ink and its link clears
 * the filter, so `hrefFor` returns the unfiltered page for it.
 */
export function RailTagList({
  tags,
  hrefFor,
  activeTag,
}: {
  tags: [tag: string, count: number][];
  hrefFor: (tag: string) => string;
  activeTag?: string;
}) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 px-2 text-[13px]">
      {tags.map(([tag, count]) => (
        <li key={tag}>
          <BlogLink
            href={hrefFor(tag)}
            aria-current={tag === activeTag ? "true" : undefined}
            className={`focus-ring rounded-sm transition-colors ${
              tag === activeTag
                ? "font-semibold text-slate-900 dark:text-slate-100"
                : "text-slate-700 hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
            }`}
          >
            #{tag}
            <span className="ml-1 tabular-nums text-slate-500 dark:text-slate-400">{count}</span>
          </BlogLink>
        </li>
      ))}
    </ul>
  );
}
