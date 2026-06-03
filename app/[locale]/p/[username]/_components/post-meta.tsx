import { blogHref } from "@/lib/host";

/**
 * Tags at the foot of a post — rendered as quiet `#tag` text links, not pills. In the reading
 * surface typography wins over boxes (the chips belong to the discovery feed, not the article), so a
 * post's tags read like a hashtag line. Tag pages live on the blog host, posts on the author
 * subdomain, so each is a cross-host link to the global topic feed.
 */
export function TagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {tags.map((tag) => (
        <li key={tag}>
          <a
            href={blogHref(`/tags/${encodeURIComponent(tag)}`)}
            className="focus-ring rounded text-[14px] text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          >
            #{tag}
          </a>
        </li>
      ))}
    </ul>
  );
}
