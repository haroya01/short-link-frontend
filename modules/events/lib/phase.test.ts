import { describe, expect, it } from "vitest";
import type { MyEvent } from "@/modules/events/api/events";
import { eventPhase, ownerEventPhase } from "./phase";

const NOW = Date.parse("2026-11-03T12:00:00Z");

const open = {
  status: "OPEN" as const,
  acceptingRegistrations: true,
  startsAt: "2026-11-10T10:00:00Z",
  endsAt: "2026-11-10T12:00:00Z",
  closeAt: null,
  spotsLeft: 5,
};

describe("eventPhase", () => {
  it("is open while the event is ahead, seats remain and the server takes registrations", () => {
    expect(eventPhase(open, NOW)).toBe("open");
    expect(eventPhase({ ...open, spotsLeft: null }, NOW)).toBe("open");
  });

  it("is full when no seat is left", () => {
    expect(eventPhase({ ...open, spotsLeft: 0, acceptingRegistrations: false }, NOW)).toBe("full");
  });

  it("is closed when the host closed it, the deadline passed, or the server stopped taking registrations", () => {
    expect(eventPhase({ ...open, status: "CLOSED", acceptingRegistrations: false }, NOW)).toBe("closed");
    expect(eventPhase({ ...open, closeAt: "2026-11-03T11:59:00Z" }, NOW)).toBe("closed");
    expect(eventPhase({ ...open, acceptingRegistrations: false }, NOW)).toBe("closed");
  });

  it("is ended once the end has passed, even if the server still takes registrations", () => {
    const august = { ...open, startsAt: "2026-08-13T11:14:00Z", endsAt: "2026-08-13T13:00:00Z" };
    expect(eventPhase(august, NOW)).toBe("ended");
  });

  it("treats the start as the end when there is no end time", () => {
    expect(eventPhase({ ...open, startsAt: "2026-11-03T11:00:00Z", endsAt: null }, NOW)).toBe("ended");
    expect(eventPhase({ ...open, startsAt: "2026-11-03T13:00:00Z", endsAt: null }, NOW)).toBe("open");
  });

  it("ends at the saved end even when it was saved before the start, the moment the server closes", () => {
    const flipped = { ...open, startsAt: "2026-11-10T10:00:00Z", endsAt: "2026-11-01T00:00:00Z" };
    expect(eventPhase(flipped, NOW)).toBe("ended");
  });

  it("puts canceled ahead of every other state, and ended ahead of closed and full", () => {
    const past = { startsAt: "2026-08-13T11:14:00Z", endsAt: null };
    expect(eventPhase({ ...open, ...past, status: "CANCELED" }, NOW)).toBe("canceled");
    expect(eventPhase({ ...open, ...past, status: "CLOSED" }, NOW)).toBe("ended");
    expect(eventPhase({ ...open, ...past, spotsLeft: 0 }, NOW)).toBe("ended");
    expect(eventPhase({ ...open, status: "CLOSED", spotsLeft: 0 }, NOW)).toBe("closed");
  });

  describe("when the server names the reason", () => {
    it.each([
      ["CANCELED", "canceled"],
      ["ENDED", "ended"],
      ["CLOSED", "closed"],
      ["DEADLINE", "closed"],
      ["FULL", "full"],
    ] as const)("%s reads as %s", (reason, phase) => {
      expect(eventPhase({ ...open, acceptingRegistrations: false, registrationClosedReason: reason }, NOW)).toBe(phase);
    });

    it("trusts an open answer over the device clock", () => {
      const august = { ...open, startsAt: "2026-08-13T11:14:00Z", endsAt: null };
      expect(eventPhase({ ...august, registrationClosedReason: null }, NOW)).toBe("open");
      expect(eventPhase(august, NOW)).toBe("ended");
    });
  });
});

describe("ownerEventPhase", () => {
  const mine = {
    id: 1, slug: "a", title: "성수 모각코", descriptionMd: null, coverImageUrl: null,
    startsAt: "2026-11-10T10:00:00Z", endsAt: null, timezone: "Asia/Seoul", locationText: null, locationUrl: null,
    onlineUrl: null, capacity: 20, closeAt: null, contactField: "KAKAO", status: "OPEN", registrationCount: 7,
    questions: [], links: [], createdAt: "2026-11-01T00:00:00Z",
  } satisfies MyEvent;

  it("reads seats from the registration count and the rest like the participant page", () => {
    expect(ownerEventPhase(mine, NOW)).toBe("open");
    expect(ownerEventPhase({ ...mine, registrationCount: 20 }, NOW)).toBe("full");
    expect(ownerEventPhase({ ...mine, status: "CLOSED" }, NOW)).toBe("closed");
    expect(ownerEventPhase({ ...mine, startsAt: "2026-10-31T10:00:00Z" }, NOW)).toBe("ended");
    expect(ownerEventPhase({ ...mine, status: "CANCELED" }, NOW)).toBe("canceled");
  });

  it("follows the server's reason when the owner view carries one", () => {
    expect(ownerEventPhase({ ...mine, registrationClosedReason: "DEADLINE" }, NOW)).toBe("closed");
    expect(ownerEventPhase({ ...mine, startsAt: "2026-10-31T10:00:00Z", registrationClosedReason: null }, NOW)).toBe("open");
  });
});
