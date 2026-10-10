import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/modules/notifications/api/notifications";
import { notificationMessageKey } from "./notification-message-key";

function item(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: 1,
    type: "COMMENT_LIKE",
    actorId: 2,
    actorUsername: "haruka",
    actorAvatarUrl: null,
    postId: 10,
    postSlug: "my-post",
    postTitle: "My post",
    postAuthorUsername: null,
    seriesId: null,
    seriesSlug: null,
    seriesTitle: null,
    collectionId: null,
    collectionName: null,
    read: false,
    createdAt: "2026-10-10T00:00:00Z",
    ...overrides,
  };
}

describe("a like on something I wrote under a post", () => {
  it("names a comment when the notice carries the comment", () => {
    expect(notificationMessageKey(item({ commentId: 7 }), "dohyun")).toBe("comment_like");
    expect(notificationMessageKey(item({ commentId: 7, count: 3 }), "dohyun")).toBe("comment_like_group");
  });

  it("names a highlight reply when the notice carries only the highlight", () => {
    expect(notificationMessageKey(item({ highlightId: 4001 }), "dohyun")).toBe("highlight_reply_like");
    expect(notificationMessageKey(item({ commentId: null, highlightId: 4001, count: 2 }), "dohyun")).toBe(
      "highlight_reply_like_group",
    );
  });

  it("leaves a highlight on my post as a highlight", () => {
    expect(notificationMessageKey(item({ type: "HIGHLIGHT", highlightId: 4001 }), "dohyun")).toBe("highlight");
  });
});

describe("a poll notice", () => {
  it("is mine only when I started it", () => {
    expect(notificationMessageKey(item({ type: "NOTE_POLL", actorUsername: "dohyun" }), "dohyun")).toBe("note_poll_mine");
    expect(notificationMessageKey(item({ type: "NOTE_POLL" }), "dohyun")).toBe("note_poll");
    expect(notificationMessageKey(item({ type: "NOTE_POLL", actorUsername: null }), null)).toBe("note_poll");
  });
});
