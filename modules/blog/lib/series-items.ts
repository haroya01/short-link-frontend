import type {
  PublicFeedItem,
  PublicPostListItem,
  PublicPostSeriesNav,
  PublicSeriesCard,
  PublicSeriesDetail,
  PublicSeriesNavLink,
  SeriesCardItem,
  SeriesItemLink,
  SeriesItemType,
  SeriesNoteSummary,
} from "@/modules/blog/api/public-posts";
import type { FollowingSeriesNote } from "@/modules/blog/api/follows";
import type { PostView } from "@/modules/blog/api/posts";
import type { SeriesDetailView, SeriesItemRef } from "@/modules/blog/api/series";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";

export type SeriesEntry =
  | { type: "POST"; post: PublicPostListItem }
  | { type: "NOTE"; note: SeriesNoteSummary };

export type OwnerSeriesEntry =
  | { type: "POST"; post: PostView }
  | { type: "NOTE"; note: SeriesNoteSummary };

export interface SeriesNavView {
  slug: string;
  title: string;
  position: number;
  total: number;
  prev: SeriesItemLink | null;
  next: SeriesItemLink | null;
}

export interface SeriesEpisode {
  key: string;
  type: SeriesItemType;
  title: string;
  href: string;
}

export type FollowingFeedRow =
  | { kind: "post"; item: PublicFeedItem }
  | { kind: "note"; note: FollowingSeriesNote };

export function seriesItemCount(series: { postCount: number; itemCount?: number }): number {
  return series.itemCount ?? series.postCount;
}

export function seriesEntries(detail: Pick<PublicSeriesDetail, "posts" | "items">): SeriesEntry[] {
  if (!detail.items) return detail.posts.map((post) => ({ type: "POST", post }));
  return detail.items.flatMap<SeriesEntry>((item) => {
    if (item.type === "POST" && item.post) return [{ type: "POST", post: item.post }];
    if (item.type === "NOTE" && item.note) return [{ type: "NOTE", note: item.note }];
    return [];
  });
}

export function ownerSeriesEntries(detail: Pick<SeriesDetailView, "posts" | "items">): OwnerSeriesEntry[] {
  if (!detail.items) return detail.posts.map((post) => ({ type: "POST", post }));
  return detail.items.flatMap<OwnerSeriesEntry>((item) => {
    if (item.type === "POST" && item.post) return [{ type: "POST", post: item.post }];
    if (item.type === "NOTE" && item.note) return [{ type: "NOTE", note: item.note }];
    return [];
  });
}

export function entryRefs(entries: OwnerSeriesEntry[]): SeriesItemRef[] {
  return entries.map((entry) =>
    entry.type === "POST" ? { type: "POST", id: entry.post.id } : { type: "NOTE", id: entry.note.id },
  );
}

export function seriesItemRefs(detail: Pick<SeriesDetailView, "posts" | "items">): SeriesItemRef[] {
  return entryRefs(ownerSeriesEntries(detail));
}

export function moveEntry<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** What a note shows where a title would go: its warning when it has one, never the hidden body. */
export function noteHeadline(note: Pick<SeriesNoteSummary, "body" | "contentWarning" | "excerpt">): string {
  return note.contentWarning?.trim() || note.excerpt?.trim() || note.body.trim();
}

function usableLink(link: SeriesItemLink | null | undefined): SeriesItemLink | null {
  if (!link) return null;
  if (link.type === "POST") return link.slug ? link : null;
  return link.noteId != null ? link : null;
}

function postLink(link: PublicSeriesNavLink | null): SeriesItemLink | null {
  return link ? { type: "POST", slug: link.slug, noteId: null, title: link.title } : null;
}

export function postSeriesNav(nav: PublicPostSeriesNav): SeriesNavView {
  return {
    slug: nav.slug,
    title: nav.title,
    position: nav.itemPosition ?? nav.position,
    total: nav.itemTotal ?? nav.total,
    prev: nav.prevItem !== undefined ? usableLink(nav.prevItem) : postLink(nav.prev),
    next: nav.nextItem !== undefined ? usableLink(nav.nextItem) : postLink(nav.next),
  };
}

export function noteSeriesNav(nav: SeriesNavView): SeriesNavView {
  return { ...nav, prev: usableLink(nav.prev), next: usableLink(nav.next) };
}

export function seriesNoteHref(username: string, noteId: number, locale: string): string {
  return authorHref(username, locale, `notes/${noteId}`);
}

export function seriesItemHref(
  username: string,
  link: { type: SeriesItemType; slug: string | null; noteId: number | null },
  locale: string,
): string {
  return link.type === "NOTE"
    ? seriesNoteHref(username, link.noteId as number, locale)
    : postHref(username, link.slug as string, locale);
}

export function seriesItemKey(link: { type: SeriesItemType; slug: string | null; noteId: number | null }): string {
  return link.type === "NOTE" ? `notes/${link.noteId}` : (link.slug as string);
}

export function seriesEpisodes(entries: SeriesEntry[], username: string, locale: string): SeriesEpisode[] {
  return entries.map((entry) =>
    entry.type === "POST"
      ? {
          key: entry.post.slug,
          type: "POST",
          title: entry.post.title,
          href: postHref(username, entry.post.slug, locale),
        }
      : {
          key: `notes/${entry.note.id}`,
          type: "NOTE",
          title: noteHeadline(entry.note),
          href: seriesNoteHref(username, entry.note.id, locale),
        },
  );
}

export function seriesCardItems(card: Pick<PublicSeriesCard, "posts" | "items">): SeriesCardItem[] {
  if (card.items) return card.items.filter((item) => (item.type === "NOTE" ? item.noteId != null : Boolean(item.slug)));
  return (card.posts ?? []).map((post) => ({
    type: "POST",
    slug: post.slug,
    noteId: null,
    title: post.title,
    ogImageUrl: post.ogImageUrl ?? null,
  }));
}

/**
 * The server cuts the subscription feed from posts and series notes as one stream, newest first, so
 * every note belongs right before the first post published earlier than it; notes older than every
 * post close the list.
 */
export function placeSeriesNotes(posts: PublicFeedItem[], notes: FollowingSeriesNote[]): FollowingFeedRow[] {
  const pending = [...notes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const rows: FollowingFeedRow[] = [];
  let next = 0;
  for (const item of posts) {
    const published = Date.parse(item.publishedAt);
    while (next < pending.length && Date.parse(pending[next].createdAt) > published) {
      rows.push({ kind: "note", note: pending[next++] });
    }
    rows.push({ kind: "post", item });
  }
  while (next < pending.length) rows.push({ kind: "note", note: pending[next++] });
  return rows;
}

export function seriesSlugFromTitle(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.length >= 2 ? base : `series-${Math.random().toString(36).slice(2, 8)}`;
}
