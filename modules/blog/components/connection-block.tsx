"use client";

import type { Connection } from "@/modules/blog/api/collections";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";

type BlockFields = Pick<
  Connection,
  "blockType" | "title" | "excerpt" | "slug" | "username" | "quote" | "body" | "noteId"
> & { refId?: number };

/** PostHighlights reads `?hl=` and `&highlightId=`; the iOS postFocusQuote deep link uses the same shape. */
export function quoteHref(username: string, slug: string, quote: string, locale: string, highlightId?: number): string {
  const base = postHref(username, slug, locale);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}hl=${encodeURIComponent(quote)}${highlightId != null && highlightId > 0 ? `&highlightId=${highlightId}` : ""}`;
}

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

  const noteId = block.noteId ?? (block.blockType === "NOTE" ? block.refId : undefined);
  if (block.blockType === "NOTE" && block.username && noteId) {
    return (
      <BlogLink
        href={authorHref(block.username, locale, `notes/${noteId}`)}
        className="focus-ring group block rounded"
        data-bhv="connection"
        data-bhv-id={`note/${noteId}`}
      >
        <span className="block text-[13px] font-semibold text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
          {block.username}
        </span>
        <span className="mt-0.5 block whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          {block.body}
        </span>
      </BlogLink>
    );
  }

  return (
    <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
      {block.body}
    </p>
  );
}
