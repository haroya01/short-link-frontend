import { describe, expect, it } from "vitest";
import {
  buildIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "./calendar-export";

const sample: CalendarEvent = {
  title: "Team Workshop",
  startsAt: "2026-06-15T14:00:00+09:00",
  endsAt: "2026-06-15T17:00:00+09:00",
  location: "Seoul, KR",
  description: "Bring your laptop",
  url: "https://example.com",
};

describe("buildIcs", () => {
  it("emits a valid RFC 5545 body with UTC-converted DTSTART/DTEND", () => {
    const ics = buildIcs(sample, "test-uid@kurl.me");
    // KST 14:00 → UTC 05:00 same day
    expect(ics).toContain("DTSTART:20260615T050000Z");
    expect(ics).toContain("DTEND:20260615T080000Z");
    expect(ics).toContain("SUMMARY:Team Workshop");
    expect(ics).toContain("UID:test-uid@kurl.me");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("uses CRLF line endings (RFC 5545 mandates)", () => {
    const ics = buildIcs(sample);
    expect(ics).toContain("\r\n");
  });

  it("escapes commas, semicolons, backslashes and newlines per §3.3.11", () => {
    const ics = buildIcs({
      ...sample,
      description: "line1\nline2;with semi,comma\\back",
      location: "Seoul, KR; Gangnam",
    });
    expect(ics).toContain("line1\\nline2\\;with semi\\,comma\\\\back");
    expect(ics).toContain("Seoul\\, KR\\; Gangnam");
  });

  it("falls back to a 60-minute default when endsAt is missing", () => {
    const ics = buildIcs({ ...sample, endsAt: null });
    expect(ics).toContain("DTSTART:20260615T050000Z");
    expect(ics).toContain("DTEND:20260615T060000Z");
  });

  it("returns null when startsAt is unparseable", () => {
    expect(buildIcs({ ...sample, startsAt: "not a date" })).toBeNull();
  });

  it("omits optional fields when null", () => {
    const minimal: CalendarEvent = {
      title: "T",
      startsAt: "2026-06-15T14:00:00+09:00",
      endsAt: null,
      location: null,
      description: null,
      url: null,
    };
    const ics = buildIcs(minimal);
    expect(ics).toContain("SUMMARY:T");
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("URL:");
  });
});

describe("googleCalendarUrl", () => {
  it("builds the TEMPLATE compose URL with dates in UTC and slash-separated", () => {
    const url = googleCalendarUrl(sample);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.host).toBe("calendar.google.com");
    expect(parsed.pathname).toBe("/calendar/render");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Team Workshop");
    expect(parsed.searchParams.get("dates")).toBe(
      "20260615T050000Z/20260615T080000Z",
    );
    expect(parsed.searchParams.get("location")).toBe("Seoul, KR");
    expect(parsed.searchParams.get("details")).toContain("Bring your laptop");
    expect(parsed.searchParams.get("details")).toContain("https://example.com");
  });

  it("returns null when timestamps are unparseable", () => {
    expect(googleCalendarUrl({ ...sample, startsAt: "garbage" })).toBeNull();
  });
});

describe("outlookCalendarUrl", () => {
  it("builds the outlook.live.com deeplink compose URL", () => {
    const url = outlookCalendarUrl(sample);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.host).toBe("outlook.live.com");
    expect(parsed.searchParams.get("rru")).toBe("addevent");
    expect(parsed.searchParams.get("subject")).toBe("Team Workshop");
    expect(parsed.searchParams.get("startdt")).toBe("2026-06-15T05:00:00.000Z");
    expect(parsed.searchParams.get("enddt")).toBe("2026-06-15T08:00:00.000Z");
  });

  it("returns null when timestamps are unparseable", () => {
    expect(outlookCalendarUrl({ ...sample, startsAt: "garbage" })).toBeNull();
  });
});
