import { afterEach, describe, expect, it } from "vitest";
import { clearDraft, readDraft, writeDraft } from "./conversation-draft";

afterEach(() => window.sessionStorage.clear());

describe("conversation drafts", () => {
  it("keep a draft per surface and target in this tab's session", () => {
    writeDraft("comment-reply", 7, "@minji 좋아요 ", 3);
    expect(readDraft("comment-reply", 7)).toMatchObject({ text: "@minji 좋아요 ", target: 3 });
    expect(readDraft("comment-reply", 8)).toBeNull();
    expect(readDraft("comment", 7)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("clear on demand", () => {
    writeDraft("highlight-reply", 41, "쓰는 중");
    clearDraft("highlight-reply", 41);
    expect(readDraft("highlight-reply", 41)).toBeNull();
  });

  it("let an empty intent go stale after ten minutes, but never a draft with words in it", () => {
    writeDraft("comment-reply", 7, "", 3);
    writeDraft("comment", 7, "아직 쓰는 중");
    const later = Date.now() + 11 * 60 * 1000;
    expect(readDraft("comment-reply", 7, later)).toBeNull();
    expect(window.sessionStorage.getItem("kurl:draft:comment-reply:7")).toBeNull();
    expect(readDraft("comment", 7, later)?.text).toBe("아직 쓰는 중");
  });
});
