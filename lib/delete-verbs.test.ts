import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";

function entries(tree: object, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]: [string, unknown]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return [[path, value] as [string, string]];
    return value && typeof value === "object" ? entries(value, path) : [];
  });
}

const at = (tree: object, key: string) => Object.fromEntries(entries(tree))[key];

// 삭제 = destroying your own thing for good · 지우기 = clearing input, history or filters ·
// 빼기 = taking something out of a container while the original stays.
const DELETE = [
  "notes.delete",
  "publicPost.highlightCardRemove",
  "postEditor.coverRemove",
  "settings.profile.remove",
  "settings.profile.imageUploader.remove",
  "postEditor.keptDiscard",
];
const CLEAR = ["publicFeed.searchClear", "publicFeed.tagFilterClear", "savedLibrary.clearHistory", "dashboard.filters.clearAll"];
const REMOVE = [
  "savedLibrary.remove",
  "settings.profile.removeLink",
  "tags.removeTag",
  "collections.unlink",
  "notes.removeImage",
  "postEditor.urlDialog.remove",
];

describe("delete, clear and remove verbs", () => {
  it("destroying your own thing says 삭제 / Delete / 削除", () => {
    for (const key of DELETE) {
      expect(at(ko, key), key).toContain("삭제");
      expect(at(en, key), key).toMatch(/\bDelete\b/);
      expect(at(ja, key), key).toContain("削除");
    }
  });

  it("clearing input, history or filters says 지우기 / Clear / クリア", () => {
    for (const key of CLEAR) {
      expect(at(ko, key), key).toContain("지우기");
      expect(at(en, key), key).toMatch(/\bClear\b/);
      expect(at(ja, key), key).toContain("クリア");
    }
  });

  it("taking something out of a container says 빼기 / Remove / 外す", () => {
    for (const key of REMOVE) {
      expect(at(ko, key), key).toContain("빼기");
      expect(at(en, key), key).toMatch(/\bRemove\b/);
      expect(at(ja, key), key).toContain("外す");
    }
  });

  it("confirms, toasts and the passive use the 삭제 forms", () => {
    expect(at(ko, "notes.deleteConfirm")).toMatch(/^이 노트를 삭제할까요\?/);
    expect(at(ko, "notes.removeReplyConfirm")).toBe("이 답글을 스레드에서 삭제할까요?");
    expect(at(ko, "notes.replyRemovedToast")).toBe("답글을 삭제했어요");
    expect(at(ko, "publicPost.highlightRemoved")).toBe("하이라이트를 삭제했어요");
    expect(at(ko, "dashboard.deleted")).toBe("링크를 삭제했어요");
    expect(at(ko, "notes.scheduledFailure.NOTE_NOT_FOUND")).toBe("답글을 달 노트가 삭제됐어요");
  });

  it("ko keeps 지우- only for clearing, and no longer says 제거 outside the legal pages", () => {
    const clearing = new Set([
      "publicFeed.searchClear",
      "publicFeed.tagFilterClear",
      "savedLibrary.clearHistory",
      "savedLibrary.clearHistoryConfirm",
      "dashboard.clearTagFilter",
      "dashboard.filters.clearAll",
      "admin.browse.links.clearFilter",
    ]);
    const legal = /^(privacy|terms)\./;
    const all = entries(ko).filter(([key]) => !legal.test(key));
    expect(all.filter(([key, value]) => /지우|지웠|지워|지울/.test(value) && !clearing.has(key))).toEqual([]);
    expect(all.filter(([, value]) => value.includes("제거"))).toEqual([]);
  });
});
