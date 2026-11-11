import { createFormatter } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { viewerTimeZone, viewerTimes } from "./viewer-times";

const FETCHED = "2026-11-10T05:02:00Z";
const UNTIL = "2026-12-01T03:00:00Z";
const serverIn = (timeZone: string) => createFormatter({ locale: "ko", timeZone });

afterEach(() => vi.restoreAllMocks());

describe("times in the viewer's zone", () => {
  it("left alone, the formatter draws in the server's zone", () => {
    expect(serverIn("UTC").dateTime(new Date(FETCHED), { dateStyle: "medium", timeStyle: "short" })).toBe(
      "2026. 11. 10. 오전 5:02",
    );
  });

  it.each([
    ["Asia/Seoul", "2026. 11. 10. 오후 2:02", "2026. 12. 1."],
    ["America/New_York", "2026. 11. 10. 오전 12:02", "2026. 11. 30."],
    ["Asia/Kathmandu", "2026. 11. 10. 오전 10:47", "2026. 12. 1."],
  ])("a viewer in %s reads their own clock and calendar whatever zone the server is in", (zone, time, date) => {
    for (const server of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
      const times = viewerTimes(serverIn(server), zone);
      expect(times.time(FETCHED)).toBe(time);
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
