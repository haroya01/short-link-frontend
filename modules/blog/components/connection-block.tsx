"use client";

import { useTranslations } from "next-intl";
import { FileText, Quote, StickyNote } from "lucide-react";
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
 * A connected block — each kind in a DIFFERENT silhouette so the eye reads the type at a glance
 * (repeating one rhythm is what reads monotonous). Post = white bordered card (an artifact to read
 * into) · highlight = green left-rule quote (a pulled passage) · note = the quietest, plain on the
 * paper. Shared by the path read, the simple collection list, and the discovery feed.
 *
 * A post block links to the post; a highlight block deep-links to the source post at that sentence; a
 * note has no destination (it lives where it is).
 */
export function ConnectionBlock({ block, locale }: { block: BlockFields; locale: string }) {
  const t = useTranslations("collections");

  if (block.blockType === "POST" && block.slug && block.username) {
    return (
      <BlogLink
        href={postHref(block.username, block.slug, locale)}
        className="focus-ring group block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      >
        <KindTag icon={<FileText className="h-3 w-3" />} label={t("blockPost")} />
        <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
          {block.title}
        </p>
        {block.excerpt && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {block.excerpt}
          </p>
        )}
      </BlogLink>
    );
  }

  if (block.blockType === "HIGHLIGHT" && block.slug && block.username) {
    return (
      <BlogLink
        href={quoteHref(block.username, block.slug, block.quote ?? "", locale)}
        className="focus-ring group flex gap-3 rounded"
      >
        <span aria-hidden className="mt-0.5 w-[3px] shrink-0 rounded-full bg-accent-600 dark:bg-accent-500" />
        <span className="min-w-0">
          <KindTag icon={<Quote className="h-3 w-3" />} label={t("blockHighlight")} />
          <span className="mt-1.5 block text-[15px] leading-relaxed text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
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

  // NOTE — a held thought. No box; sits plainly on the paper, the quietest of the three.
  return (
    <div>
      <KindTag icon={<StickyNote className="h-3 w-3" />} label={t("blockNote")} />
      <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {block.body}
      </p>
    </div>
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

function KindTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
      {icon}
      {label}
    </span>
  );
}
