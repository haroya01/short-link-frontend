import { getTranslations } from "next-intl/server";
import { blogPath } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { BlogLink } from "@/modules/blog/components/blog-link";
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
  // Guarantee the current tag shows even if it isn't in the popular set — but never re-insert a junk
  // activeTag (a "#ㄴ" someone navigated to directly) as a chip; the filter above would have dropped it.
  const list =
    clean.some((t) => t.tag === activeTag) || !isDisplayableTag(activeTag)
      ? clean
      : [{ tag: activeTag, count: 0 }, ...clean];
  const qs = sort === "trending" ? "?sort=trending" : "";

  return (
    <div className="relative -mx-4 mt-4 sm:-mx-6">
      <nav
        aria-label={tt("railPopularTags")}
        className="overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-x-4 whitespace-nowrap text-[14px]">
          {list.map((tag) => {
            const active = tag.tag === activeTag;
            return (
              <li key={tag.tag} className="shrink-0">
                <BlogLink
                  href={blogPath(`/tags/${encodeURIComponent(tag.tag)}${qs}`)}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "focus-ring rounded font-semibold text-slate-900 underline decoration-slate-900 decoration-2 underline-offset-[6px] dark:text-slate-100 dark:decoration-slate-100"
                      : "focus-ring rounded text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                  }
                >
                  #{tag.tag}
                  {tag.count > 0 && (
                    <span className="ml-1 tabular-nums text-slate-500 dark:text-slate-400">{tag.count}</span>
                  )}
                </BlogLink>
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
