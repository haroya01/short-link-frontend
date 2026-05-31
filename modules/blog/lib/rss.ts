import type { PublicFeedItem, PublicPostListItem, PublicAuthor } from "@/modules/blog/api/public-posts";
import { postHref } from "@/modules/blog/components/feed-card";

/** Minimal RSS 2.0 builder for the blog + per-author feeds. Path is `/feed` (not `.xml`) because the
 *  middleware skips dotted paths, which would break the subdomain/blog-host rewrites. Feed readers
 *  rely on the content-type + the `<link rel="alternate">` discovery tag, not the extension. */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type RssItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  tags: string[];
  author: { username: string };
};

/** Absolute post URL. postHref is already absolute on prod (author subdomain); on dev/preview it's a
 *  path, so prefix the request origin. */
function absoluteUrl(item: RssItem, locale: string, origin: string): string {
  const href = postHref(item.author.username, item.slug, locale);
  return href.startsWith("http") ? href : `${origin}${href}`;
}

export function buildRss(opts: {
  title: string;
  link: string;
  description: string;
  selfUrl: string;
  locale: string;
  items: RssItem[];
  origin: string;
}): string {
  const { title, link, description, selfUrl, locale, items, origin } = opts;
  const entries = items
    .map((it) => {
      const url = absoluteUrl(it, locale, origin);
      const parts = [
        `      <title>${esc(it.title)}</title>`,
        `      <link>${esc(url)}</link>`,
        `      <guid isPermaLink="true">${esc(url)}</guid>`,
        `      <pubDate>${new Date(it.publishedAt).toUTCString()}</pubDate>`,
        `      <dc:creator>${esc(it.author.username)}</dc:creator>`,
        it.excerpt ? `      <description>${esc(it.excerpt)}</description>` : "",
        ...it.tags.map((t) => `      <category>${esc(t)}</category>`),
      ].filter(Boolean);
      return `    <item>\n${parts.join("\n")}\n    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <description>${esc(description)}</description>
    <language>${esc(locale)}</language>
    <atom:link href="${esc(selfUrl)}" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>`;
}

/** Adapts the two API item shapes (feed / author list) to the RSS item shape. */
export function feedItemForRss(item: PublicFeedItem): RssItem {
  return {
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    publishedAt: item.publishedAt,
    tags: item.tags,
    author: { username: item.author.username },
  };
}

export function authorPostForRss(post: PublicPostListItem, author: PublicAuthor): RssItem {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    tags: post.tags,
    author: { username: author.username },
  };
}
