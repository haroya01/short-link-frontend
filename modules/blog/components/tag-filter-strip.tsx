import { blogHref } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { TagChip } from "@/modules/blog/components/tag-chip";

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
              <TagChip
                href={blogHref(`/tags/${encodeURIComponent(tag.tag)}${qs}`)}
                label={tag.tag}
                count={tag.count}
                active={active}
                ariaCurrent={active ? "page" : undefined}
              />
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
