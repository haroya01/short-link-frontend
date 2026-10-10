import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";

const MESSAGE_KEY: Record<Item["type"], string> = {
  LIKE: "like",
  COMMENT: "comment",
  FOLLOW: "follow",
  SERIES_SUBSCRIBE: "series_subscribe",
  REPLY: "reply",
  NEW_POST: "new_post",
  MENTION: "mention",
  CONNECTED: "connected",
  PATH_GREW: "path_grew",
  NOTE_LIKE: "note_like",
  NOTE_REPOST: "note_repost",
  NOTE_REPLY: "note_reply",
  NOTE_QUOTE: "note_quote",
  NOTE_MENTION: "note_mention",
  NOTE_POLL: "note_poll",
  NOTE_POST: "note_post",
  NOTE_EDIT: "note_edit",
  REMOTE_FOLLOW: "remote_follow",
  FOLLOW_REQUEST: "follow_request",
  POST_QUOTE: "post_quote",
  NOTE_EMBED: "note_embed",
  COMMENT_LIKE: "comment_like",
  HIGHLIGHT: "highlight",
};

/**
 * The message for a row. A like on a highlight reply arrives as COMMENT_LIKE with `highlightId` and no
 * `commentId` (backend #803 reuses the type), so it is told apart here rather than called a comment.
 */
export function notificationMessageKey(item: Item, myUsername: string | null): string {
  if (item.type === "NOTE_POLL" && myUsername != null && item.actorUsername === myUsername) return "note_poll_mine";
  const key =
    item.type === "COMMENT_LIKE" && item.commentId == null && item.highlightId != null
      ? "highlight_reply_like"
      : MESSAGE_KEY[item.type];
  return (item.count ?? 1) > 1 ? `${key}_group` : key;
}
