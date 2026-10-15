import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES, type NotificationType } from "@/modules/notifications/api/notifications";
import { SECTIONS, servedSections } from "./blog-notification-settings";

const READER_TYPES: NotificationType[] = ["POST_FIRST_READER", "POST_READ_MILESTONE"];

function served(types: readonly NotificationType[]) {
  return Object.fromEntries(types.map((type) => [type, true]));
}

describe("blog notification settings", () => {
  it("places every notification type in exactly one section", () => {
    const placed = SECTIONS.flatMap((section) => section.rows.map((row) => row.type));
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...NOTIFICATION_TYPES].sort());
  });

  it("puts the reader switches under the writer's own posts", () => {
    const posts = SECTIONS.find((section) => section.titleKey === "prefSectionPosts");
    expect(posts?.rows.slice(-2).map((row) => row.type)).toEqual(READER_TYPES);
  });

  it("shows only the switches the server knows, so a server without reader notices looks as before", () => {
    const all = SECTIONS.flatMap((section) => section.rows.map((row) => row.type));
    const before = all.filter((type) => !READER_TYPES.includes(type));
    const typesOf = (prefs: Record<string, boolean>) =>
      servedSections(prefs).flatMap((section) => section.rows.map((row) => row.type));

    expect(typesOf(served(before))).toEqual(before);
    expect(servedSections(served(before)).map((section) => section.titleKey)).toEqual(
      SECTIONS.map((section) => section.titleKey),
    );
    expect(typesOf(served(NOTIFICATION_TYPES))).toEqual(all);
  });

  it("drops a section whose switches the server knows none of", () => {
    const titles = servedSections(served(["LIKE", "NOTE_LIKE"])).map((section) => section.titleKey);
    expect(titles).toEqual(["prefSectionPosts", "prefSectionNotes"]);
  });
});
