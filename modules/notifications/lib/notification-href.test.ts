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

  it("opens the recipient's own note for likes and reposts", () => {
    expect(notificationHref(item({ type: "NOTE_LIKE", noteId: 5 }), "me", "ko")).toBe("/ko/p/me/notes/5");
    expect(notificationHref(item({ type: "NOTE_REPOST", noteId: 5 }), null, "ko")).toBeUndefined();
  });

  it("opens the reply or quote itself, under the member who wrote it", () => {
    expect(
      notificationHref(item({ type: "NOTE_REPLY", noteId: 5, sourceNoteId: 9 }), "me", "en"),
    ).toBe("/en/p/minji/notes/9");
    expect(
      notificationHref(
        item({ type: "NOTE_QUOTE", sourceNoteId: 9, actorUsername: "a@m.social", actorProfileUrl: "https://m.social/@a" }),
        "me",
        "en",
      ),
    ).toBeUndefined();
  });

  describe("from an account on another server", () => {
    const remote = { actorId: null, actorUsername: "a@m.social", actorProfileUrl: "https://m.social/@a", actorRemoteId: 42 };

    it("opens the reply on its copy here, which shows the recipient's note above it", () => {
      expect(
        notificationHref(item({ ...remote, type: "NOTE_REPLY", noteId: 5, sourceNoteId: 9 }), "me", "en"),
      ).toMatch(/^\/(blog-preview\/)?remote\/42\/notes\/9$/);
    });

    it("opens the note that mentions the recipient, or the edited note, on its copy here", () => {
      expect(notificationHref(item({ ...remote, type: "NOTE_MENTION", noteId: 12 }), "me", "ko")).toMatch(
        /^\/(blog-preview\/)?remote\/42\/notes\/12$/,
      );
      expect(notificationHref(item({ ...remote, type: "NOTE_EDIT", noteId: 17 }), "me", "ko")).toMatch(
        /^\/(blog-preview\/)?remote\/42\/notes\/17$/,
      );
    });

    it("still opens the recipient's own note for a like or a repost", () => {
      expect(notificationHref(item({ ...remote, type: "NOTE_LIKE", noteId: 5 }), "me", "ko")).toBe("/ko/p/me/notes/5");
      expect(notificationHref(item({ ...remote, type: "NOTE_REPOST", noteId: 5 }), "me", "ko")).toBe(
        "/ko/p/me/notes/5",
      );
    });

    it("stays unlinked when this server doesn't know the account", () => {
      expect(
        notificationHref(item({ ...remote, actorRemoteId: null, type: "NOTE_MENTION", noteId: 12 }), "me", "ko"),
      ).toBeUndefined();
    });
  });

  it("opens the note that mentions the recipient, under the member who wrote it", () => {
    expect(notificationHref(item({ type: "NOTE_MENTION", noteId: 12 }), "me", "ko")).toBe(
      "/ko/p/minji/notes/12",
    );
  });

  it("opens an ended poll under its author, who is the notice's actor", () => {
    expect(notificationHref(item({ type: "NOTE_POLL", noteId: 14 }), "me", "ko")).toBe(
      "/ko/p/minji/notes/14",
    );
  });

  it("opens a new note from someone whose bell the recipient rang, under its author", () => {
    expect(notificationHref(item({ type: "NOTE_POST", noteId: 16 }), "me", "ko")).toBe(
      "/ko/p/minji/notes/16",
    );
  });

  it("opens an edited note the recipient shared, under its author", () => {
    expect(notificationHref(item({ type: "NOTE_EDIT", noteId: 17 }), "me", "ko")).toBe(
      "/ko/p/minji/notes/17",
    );
  });

  it("leaves a follow from another server to its external profile", () => {
    expect(
      notificationHref(item({ type: "REMOTE_FOLLOW", actorProfileUrl: "https://m.social/@a" }), "me", "ko"),
    ).toBeUndefined();
  });

  it("opens a follow from another server in the app when this server knows the account", () => {
    expect(
      notificationHref(
        item({ type: "REMOTE_FOLLOW", actorProfileUrl: "https://m.social/@a", actorRemoteId: 42 }),
        "me",
        "ko",
      ),
    ).toMatch(/\/remote\/42$/);
  });

  it("sends a follow request to the requests page", () => {
    expect(notificationHref(item({ type: "FOLLOW_REQUEST", actorUsername: "sori" }), "me", "ko")).toMatch(
      /\/follow-requests$/,
    );
  });

  it("opens the note that quoted the recipient's post, under the member who wrote it", () => {
    expect(notificationHref(item({ type: "POST_QUOTE", noteId: 18, postSlug: null }), "me", "ko")).toBe(
      "/ko/p/minji/notes/18",
    );
  });

  it("opens the post that quoted the recipient's note, under its author", () => {
    expect(
      notificationHref(item({ type: "NOTE_EMBED", postAuthorUsername: "minji", postSlug: "roundup" }), "me", "ko"),
    ).toBe("/ko/p/minji/roundup");
  });

  it("lands a comment like on the comment, whoever owns the post", () => {
    expect(notificationHref(item({ type: "COMMENT_LIKE", commentId: 70 }), "me", "ko")).toBe(
      "/ko/p/me/my-post#comment-70",
    );
    expect(
      notificationHref(item({ type: "COMMENT_LIKE", postAuthorUsername: "owner", commentId: 71 }), "me", "ko"),
    ).toBe("/ko/p/owner/my-post#comment-71");
  });

  it("opens the newest highlight on the recipient's post", () => {
    expect(notificationHref(item({ type: "HIGHLIGHT", highlightId: 42 }), "me", "ko")).toBe(
      "/ko/p/me/my-post?highlightId=42&thread=1",
    );
  });
});
