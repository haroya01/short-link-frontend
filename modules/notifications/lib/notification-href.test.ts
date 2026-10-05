import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/modules/notifications/api/notifications";
import { notificationHref } from "./notification-href";

function item(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: 1,
    type: "COMMENT",
    actorId: 2,
    actorUsername: "minji",
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
    createdAt: "2026-10-05T00:00:00Z",
    ...overrides,
  };
}

describe("notificationHref", () => {
  it("lands a comment notice on that comment", () => {
    expect(notificationHref(item({ commentId: 77 }), "me", "ko")).toBe("/ko/p/me/my-post#comment-77");
  });

  it("lands a reply on its comment inside someone else's post", () => {
    expect(
      notificationHref(item({ type: "REPLY", postAuthorUsername: "owner", commentId: 78 }), "me", "en"),
    ).toBe("/en/p/owner/my-post#comment-78");
  });

  it("opens the conversation of a highlight reply or mention", () => {
    expect(
      notificationHref(item({ type: "MENTION", postAuthorUsername: "owner", highlightId: 41 }), "me", "ja"),
    ).toBe("/ja/p/owner/my-post?highlightId=41&thread=1");
  });

  it("keeps the post link for notices recorded before the spot existed", () => {
    expect(notificationHref(item({}), "me", "ko")).toBe("/ko/p/me/my-post");
    expect(notificationHref(item({ type: "LIKE", commentId: null }), "me", "ko")).toBe("/ko/p/me/my-post");
  });

  it("never adds a spot to a new-post notice", () => {
    expect(
      notificationHref(item({ type: "NEW_POST", actorUsername: "minji", commentId: 5 }), "me", "ko"),
    ).toBe("/ko/p/minji/my-post");
  });
});
