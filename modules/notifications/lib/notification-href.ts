import { blogPath } from "@/lib/host";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";

/**
 * Where a row navigates, by type. The recipient (`myUsername`) authors LIKE/COMMENT posts and owns
 * the subscribed series; REPLY carries the post owner's handle (the post may be someone else's);
 * NEW_POST's author is the actor. The graph events (CONNECTED / PATH_GREW) land on the collection
 * that changed. Returns undefined when the needed handle/slug/id is missing.
 */
export function notificationHref(item: Item, myUsername: string | null, locale: string): string | undefined {
  switch (item.type) {
    case "CONNECTED":
    case "PATH_GREW":
      // 그래프 이벤트 — 엮인/이어진 그 컬렉션으로. 컬렉션은 블로그 같은 오리진이라 소프트 내비(blogPath).
      return item.collectionId != null
        ? blogPath(`/collections/${item.collectionId}`)
        : undefined;
    case "FOLLOW":
      return item.actorUsername ? authorHref(item.actorUsername, locale) : undefined;
    case "REMOTE_FOLLOW":
      return undefined;
    case "NOTE_LIKE":
    case "NOTE_REPOST":
      return item.noteId != null && myUsername
        ? authorHref(myUsername, locale, `notes/${item.noteId}`)
        : undefined;
    case "NOTE_MENTION":
    case "NOTE_POLL":
    case "NOTE_POST":
      return item.noteId != null && item.actorUsername && !item.actorProfileUrl
        ? authorHref(item.actorUsername, locale, `notes/${item.noteId}`)
        : undefined;
    case "NOTE_REPLY":
    case "NOTE_QUOTE":
      // The reply or quote is the actor's note; it shows the recipient's note above it.
      return item.sourceNoteId != null && item.actorUsername && !item.actorProfileUrl
        ? authorHref(item.actorUsername, locale, `notes/${item.sourceNoteId}`)
        : undefined;
    case "SERIES_SUBSCRIBE":
      return item.seriesSlug && myUsername
        ? authorHref(myUsername, locale, `series/${item.seriesSlug}`)
        : undefined;
    case "NEW_POST":
      return item.postSlug && item.actorUsername
        ? postHref(item.actorUsername, item.postSlug, locale)
        : undefined;
    case "REPLY":
    case "MENTION":
      // The post may be someone else's — the owner's handle rides in the payload.
      return item.postSlug && item.postAuthorUsername
        ? atSpot(postHref(item.postAuthorUsername, item.postSlug, locale), item)
        : undefined;
    default: // LIKE / COMMENT — the recipient is the post's author
      return item.postSlug && myUsername
        ? atSpot(postHref(myUsername, item.postSlug, locale), item)
        : undefined;
  }
}

function atSpot(href: string, item: Item): string {
  if (item.commentId != null) return `${href}#comment-${item.commentId}`;
  if (item.highlightId != null) return `${href}?highlightId=${item.highlightId}&thread=1`;
  return href;
}
