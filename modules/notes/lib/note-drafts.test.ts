import { afterEach, describe, expect, it } from "vitest";
import {
  NOTE_DRAFT_LIMIT,
  deleteNoteDraft,
  hasDraftContent,
  noteDraftLabel,
  readNoteDrafts,
  restoredSchedule,
  saveNoteDraft,
  type NoteDraft,
} from "./note-drafts";

const draft = (over: Partial<NoteDraft> = {}): NoteDraft => ({
  id: "a",
  updatedAt: 1,
  body: "쓰던 노트",
  parts: [],
  warning: null,
  visibility: "public",
  replyPolicy: "everyone",
  language: "ko",
  poll: null,
  scheduledAt: "",
  quote: null,
  imageCount: 0,
  ...over,
});

afterEach(() => localStorage.clear());

describe("note drafts", () => {
  it("keeps each account's drafts apart, newest first", () => {
    saveNoteDraft(1, draft({ id: "old", updatedAt: 10 }));
    saveNoteDraft(1, draft({ id: "new", updatedAt: 20 }));
    saveNoteDraft(2, draft({ id: "other", updatedAt: 30 }));
    expect(readNoteDrafts(1).map((d) => d.id)).toEqual(["new", "old"]);
    expect(readNoteDrafts(2).map((d) => d.id)).toEqual(["other"]);
    expect(localStorage.getItem("kurl:note-drafts:1")).not.toBeNull();
  });

  it("replaces a draft in place by id, and drops one that lost its content", () => {
    saveNoteDraft(1, draft({ id: "a", body: "처음" }));
    saveNoteDraft(1, draft({ id: "a", body: "고친 글", updatedAt: 2 }));
    expect(readNoteDrafts(1)).toHaveLength(1);
    expect(readNoteDrafts(1)[0].body).toBe("고친 글");

    saveNoteDraft(1, draft({ id: "a", body: "   ", updatedAt: 3 }));
    expect(readNoteDrafts(1)).toEqual([]);
    expect(localStorage.getItem("kurl:note-drafts:1")).toBeNull();
  });

  it("keeps only the newest drafts past the limit", () => {
    for (let i = 0; i < NOTE_DRAFT_LIMIT + 3; i += 1) saveNoteDraft(1, draft({ id: `d${i}`, updatedAt: i }));
    const kept = readNoteDrafts(1);
    expect(kept).toHaveLength(NOTE_DRAFT_LIMIT);
    expect(kept[0].id).toBe(`d${NOTE_DRAFT_LIMIT + 2}`);
    expect(kept.some((d) => d.id === "d0")).toBe(false);
  });

  it("deletes one draft", () => {
    saveNoteDraft(1, draft({ id: "a" }));
    saveNoteDraft(1, draft({ id: "b", updatedAt: 2 }));
    deleteNoteDraft(1, "a");
    expect(readNoteDrafts(1).map((d) => d.id)).toEqual(["b"]);
  });

  it("counts text, thread parts, a warning or poll options as content, but not a bare quote or pictures", () => {
    expect(hasDraftContent(draft({ body: "" }))).toBe(false);
    expect(hasDraftContent(draft({ body: "", parts: ["둘째"] }))).toBe(true);
    expect(hasDraftContent(draft({ body: "", warning: "스포일러" }))).toBe(true);
    expect(hasDraftContent(draft({ body: "", warning: "" }))).toBe(false);
    expect(hasDraftContent(draft({ body: "", poll: { options: ["", ""], expiresIn: 86400, multiple: false } }))).toBe(false);
    expect(hasDraftContent(draft({ body: "", poll: { options: ["예", ""], expiresIn: 86400, multiple: false } }))).toBe(true);
    expect(
      hasDraftContent(draft({ body: "", imageCount: 2, quote: { post: { id: 1, title: "t", slug: "s", authorUsername: "u" } } })),
    ).toBe(false);
  });

  it("reads a broken or foreign value as no drafts", () => {
    localStorage.setItem("kurl:note-drafts:1", "{not json");
    expect(readNoteDrafts(1)).toEqual([]);
    localStorage.setItem("kurl:note-drafts:1", JSON.stringify([{ id: 3 }, draft({ id: "ok" })]));
    expect(readNoteDrafts(1).map((d) => d.id)).toEqual(["ok"]);
  });

  it("keeps a restored schedule only while it is still ahead", () => {
    const now = Date.parse("2026-10-10T12:00:00");
    expect(restoredSchedule("2026-10-10T13:00", now)).toBe("2026-10-10T13:00");
    expect(restoredSchedule("2026-10-10T11:00", now)).toBe("");
    expect(restoredSchedule("", now)).toBe("");
  });

  it("labels a draft by its first line of text, then a poll option", () => {
    expect(noteDraftLabel(draft({ body: "첫 줄\n둘째 줄" }))).toBe("첫 줄");
    expect(noteDraftLabel(draft({ body: "", parts: ["", "스레드 둘째"] }))).toBe("스레드 둘째");
    expect(noteDraftLabel(draft({ body: "", poll: { options: ["짜장", "짬뽕"], expiresIn: 1, multiple: false } }))).toBe("짜장");
  });
});
