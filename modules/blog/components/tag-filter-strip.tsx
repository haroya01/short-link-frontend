import { getTranslations } from "next-intl/server";
import { blogPath } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";

/**
 * Persistent popular-tag chips on a tag's feed page — so clicking into a topic doesn't strip away
 * the tag list: the reader can hop straight to another tag (the current one is highlighted) instead
 * of going back to the index. Horizontal-scroll so it works on mobile too, where there's no rail.
 * Preserves the active sort (`?sort=trending`) when switching tags.
 */
export async function TagFilterStrip({
  tags,
  activeTag,
  sort,
}: {
  tags: TagCount[];
  activeTag: string;
  sort?: "recent" | "trending";
}) {
  const tt = await getTranslations("publicFeed");
  // Drop junk tags (incomplete jamo, single-char, mash) so they never become clickable filters.
  const clean = tags.filter((t) => isDisplayableTag(t.tag));
  if (clean.length === 0) return null;
  // Guarantee the current tag shows even if it isn't in the popular set.
  const list = clean.some((t) => t.tag === activeTag)
    ? clean
    : [{ tag: activeTag, count: 0 }, ...clean];
  const qs = sort === "trending" ? "?sort=trending" : "";

  return (
    <div className="relative -mx-4 mt-4 sm:-mx-6">
      <nav
        aria-label={tt("railPopularTags")}
        className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-2">
        {list.map((tag) => {
          const active = tag.tag === activeTag;
          return (
            <li key={tag.tag} className="shrink-0">
              <TagChip
                href={blogPath(`/tags/${encodeURIComponent(tag.tag)}${qs}`)}
                label={tag.tag}
                count={tag.count}
                active={active}
                ariaCurrent={active ? "page" : undefined}
                soft
              />
            </li>
          );
        })}
        </ul>
      </nav>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent dark:from-slate-950"
      />
    </div>
  );
}
