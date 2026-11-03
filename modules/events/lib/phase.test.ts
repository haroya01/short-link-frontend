import { describe, expect, it } from "vitest";
import { eventPhase } from "./phase";

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

  it("uses the later of start and end when the end was saved before the start", () => {
    const flipped = { ...open, startsAt: "2026-11-10T10:00:00Z", endsAt: "2026-11-01T00:00:00Z" };
    expect(eventPhase(flipped, NOW)).toBe("open");
  });

  it("puts canceled ahead of every other state, and ended ahead of closed and full", () => {
    const past = { startsAt: "2026-08-13T11:14:00Z", endsAt: null };
    expect(eventPhase({ ...open, ...past, status: "CANCELED" }, NOW)).toBe("canceled");
    expect(eventPhase({ ...open, ...past, status: "CLOSED" }, NOW)).toBe("ended");
    expect(eventPhase({ ...open, ...past, spotsLeft: 0 }, NOW)).toBe("ended");
    expect(eventPhase({ ...open, status: "CLOSED", spotsLeft: 0 }, NOW)).toBe("closed");
  });
});
