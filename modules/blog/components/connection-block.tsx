"use client";

import type { Connection, ConnectionEvent } from "@/modules/blog/api/collections";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { postHref } from "@/modules/blog/components/feed-card";

/** The flat block fields shared by a {@link Connection} and a {@link ConnectionEvent}. */
type BlockFields = Pick<
  Connection,
  "blockType" | "title" | "excerpt" | "slug" | "username" | "quote" | "body"
>;

/** Deep-link a highlight to its source post AT that sentence — `?hl=<encoded quote>` is read by
 *  PostHighlights, which scrolls to the matching painted span and flashes it (mirrors the iOS
 *  postFocusQuote deep-link). */
export function quoteHref(username: string, slug: string, quote: string, locale: string): string {
  const base = postHref(username, slug, locale);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}hl=${encodeURIComponent(quote)}`;
}

/**
 * A connected block — converged to the 일반 글 카드 문법(#891): the block's own content is the card,
 * with no type-tag pill, no decorative icon, and no nested box. Post = title as a plain card-title link
 * on the paper (like any feed card) · highlight = green left-rule quote (the pulled passage IS the
 * content, so its spine stays) · note = the held thought, plain and quietest. Shared by the path read,
 * the collection list, related blocks, and the highlight thread panel.
 *
 * A post block links to the post; a highlight block deep-links to the source post at that sentence; a
 * note has no destination (it lives where it is).
 */
export function ConnectionBlock({ block, locale }: { block: BlockFields; locale: string }) {
  if (block.blockType === "POST" && block.slug && block.username) {
    return (
      <div>
        <BlogLink
          href={postHref(block.username, block.slug, locale)}
          className="focus-ring rounded text-card-title-xs font-semibold leading-snug tracking-tight text-slate-900 transition-colors hover:text-accent-700 dark:text-slate-100 dark:hover:text-accent-400"
          data-bhv="connection"
          data-bhv-id={`${block.username}/${block.slug}`}
        >
          {block.title}
        </BlogLink>
        {block.excerpt && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {block.excerpt}
          </p>
        )}
      </div>
    );
  }

  if (block.blockType === "HIGHLIGHT" && block.slug && block.username) {
    return (
      <BlogLink
        href={quoteHref(block.username, block.slug, block.quote ?? "", locale)}
        className="focus-ring group flex gap-2.5 rounded"
        data-bhv="connection"
        data-bhv-id={`${block.username}/${block.slug}`}
      >
        <span aria-hidden className="mt-0.5 w-[3px] shrink-0 rounded-full bg-accent-600 dark:bg-accent-500" />
        <span className="min-w-0">
          <span className="block text-[15px] leading-relaxed text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
            {block.quote}
          </span>
          {block.title && (
            <span className="mt-1 block truncate text-[12px] text-slate-500 dark:text-slate-400">
              {block.title}
            </span>
          )}
        </span>
      </BlogLink>
    );
  }

  // NOTE — a held thought. Plain on the paper, the quietest of the three.
  return (
    <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
      {block.body}
    </p>
  );
}

/** Pull the flat block fields off a discovery event (same shape, extra envelope fields). */
export function eventBlock(event: ConnectionEvent): BlockFields {
  return {
    blockType: event.blockType,
    title: event.title,
    excerpt: event.excerpt,
    slug: event.slug,
    username: event.username,
    quote: event.quote,
    body: event.body,
  };
}
