import { blogHref } from "@/lib/host";
import { BlogChromeLink } from "@/modules/blog/components/blog-link";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";

/**
 * Tags at the foot of a post — rendered as quiet `#tag` text links, not pills. In the reading
 * surface typography wins over boxes (the chips belong to the discovery feed, not the article), so a
 * post's tags read like a hashtag line. Tag pages + posts both live on the blog host now
 * (blog.kurl.me/@user), so this is a same-origin hop — BlogChromeLink soft-navigates when the origins
 * match (and hard-falls-back on any remaining author-subdomain render).
 */
export function TagChips({ tags }: { tags: string[] }) {
  // Filter junk tags (incomplete jamo, single-char, mash) so the hashtag line never carries them.
  const clean = (tags ?? []).filter(isDisplayableTag);
  if (clean.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {clean.map((tag) => (
        <li key={tag}>
          <BlogChromeLink
            href={blogHref(`/tags/${encodeURIComponent(tag)}`)}
            className="focus-ring rounded text-[14px] text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          >
            #{tag}
          </BlogChromeLink>
        </li>
      ))}
    </ul>
  );
}
