import { blogHref } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";

/**
 * Persistent popular-tag chips on a tag's feed page — so clicking into a topic doesn't strip away
 * the tag list: the reader can hop straight to another tag (the current one is highlighted) instead
 * of going back to the index. Horizontal-scroll so it works on mobile too, where there's no rail.
 * Preserves the active sort (`?sort=trending`) when switching tags.
 */
export function TagFilterStrip({
  tags,
  activeTag,
  sort,
}: {
  tags: TagCount[];
  activeTag: string;
  sort?: "recent" | "trending";
}) {
  if (tags.length === 0) return null;
  // Guarantee the current tag shows even if it isn't in the popular set.
  const list = tags.some((t) => t.tag === activeTag)
    ? tags
    : [{ tag: activeTag, count: 0 }, ...tags];
  const qs = sort === "trending" ? "?sort=trending" : "";

  return (
    <div className="relative -mx-4 mt-4 sm:-mx-6">
      <nav
        aria-label="tags"
        className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-2">
        {list.map((tag) => {
          const active = tag.tag === activeTag;
          return (
            <li key={tag.tag} className="shrink-0">
              <a
                href={blogHref(`/tags/${encodeURIComponent(tag.tag)}${qs}`)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1 ${
                  active
                    ? "bg-accent-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700"
                }`}
              >
                <span>{tag.tag}</span>
                {!active && <span className="text-slate-500">{tag.count}</span>}
              </a>
            </li>
          );
        })}
        </ul>
      </nav>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white to-transparent sm:block"
      />
    </div>
  );
}
