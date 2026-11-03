import { describe, expect, it } from "vitest";
import { daysUntil, linkExpiry } from "./link-expiry";

const now = Date.parse("2026-11-03T14:30:00Z");

describe("one expiry rule for rows, filters, the banner and the stats header", () => {
  it("counts D-n in calendar days of the owner's time zone, not in 24-hour blocks", () => {
    expect(linkExpiry("2026-11-03T16:00:00Z", { now, timezone: "Asia/Seoul" })).toEqual({ kind: "soon", days: 1 });
    expect(linkExpiry("2026-11-03T16:00:00Z", { now, timezone: "UTC" })).toEqual({ kind: "soon", days: 0 });
    expect(linkExpiry("2026-11-05T20:00:00Z", { now, timezone: "Asia/Seoul" })).toEqual({ kind: "soon", days: 3 });
  });

  it("calls a link expiring soon exactly when the backend's 3-day filter does", () => {
    expect(linkExpiry("2026-11-06T14:29:59Z", { now })?.kind).toBe("soon");
    expect(linkExpiry("2026-11-06T14:30:00Z", { now })?.kind).toBe("later");
    expect(linkExpiry("2026-11-03T14:29:59Z", { now })).toEqual({ kind: "expired" });
    expect(linkExpiry(null, { now })).toBeNull();
  });
});

describe("days left before a deleted link is purged", () => {
  it("counts calendar days in the owner's time zone and never goes below zero", () => {
    expect(daysUntil("2026-12-03T14:30:00Z", { now, timezone: "Asia/Seoul" })).toBe(30);
    expect(daysUntil("2026-11-03T16:00:00Z", { now, timezone: "Asia/Seoul" })).toBe(1);
    expect(daysUntil("2026-11-03T16:00:00Z", { now, timezone: "UTC" })).toBe(0);
    expect(daysUntil("2026-11-01T00:00:00Z", { now })).toBe(0);
  });
});
