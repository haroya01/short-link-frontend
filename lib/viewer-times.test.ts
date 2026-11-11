import { createFormatter } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { viewerTimeZone, viewerTimes } from "./viewer-times";

const FETCHED = "2026-11-10T05:02:00Z";
const UNTIL = "2026-12-01T03:00:00Z";
const TIME = { dateStyle: "medium", timeStyle: "short" } as const;
const serverIn = (timeZone: string) => createFormatter({ locale: "ko", timeZone });
// The word for AM/PM in Korean differs between ICU versions, so whole strings come from Intl itself.
const drawnIn = (timeZone: string, iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ko", { ...options, timeZone }).format(new Date(iso));

afterEach(() => vi.restoreAllMocks());

describe("times in the viewer's zone", () => {
  it("left alone, the formatter draws in the server's zone", () => {
    const drawn = serverIn("UTC").dateTime(new Date(FETCHED), TIME);
    expect(drawn).toBe(drawnIn("UTC", FETCHED, TIME));
    expect(drawn).toMatch(/^2026\. 11\. 10\. \S+ 5:02$/);
  });

  it.each([
    ["Asia/Seoul", /^2026\. 11\. 10\. \S+ 2:02$/, "2026. 12. 1."],
    ["America/New_York", /^2026\. 11\. 10\. \S+ 12:02$/, "2026. 11. 30."],
    ["Asia/Kathmandu", /^2026\. 11\. 10\. \S+ 10:47$/, "2026. 12. 1."],
  ])("a viewer in %s reads their own clock and calendar whatever zone the server is in", (zone, clock, date) => {
    for (const server of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
      const times = viewerTimes(serverIn(server), zone);
      expect(times.time(FETCHED)).toBe(drawnIn(zone, FETCHED, TIME));
      expect(times.time(FETCHED)).toMatch(clock);
      expect(times.date(UNTIL)).toBe(date);
    }
  });

  it("takes the viewer's zone from the browser", () => {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...resolved,
      timeZone: "America/New_York",
    });
    expect(viewerTimeZone()).toBe("America/New_York");
  });
});
