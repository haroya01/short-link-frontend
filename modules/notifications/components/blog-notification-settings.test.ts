import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES } from "@/modules/notifications/api/notifications";
import { SECTIONS } from "./blog-notification-settings";

describe("blog notification settings", () => {
  it("places every notification type in exactly one section", () => {
    const placed = SECTIONS.flatMap((section) => section.rows.map((row) => row.type));
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...NOTIFICATION_TYPES].sort());
  });
});
