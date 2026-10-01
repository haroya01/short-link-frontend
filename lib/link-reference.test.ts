import { describe, expect, it } from "vitest";

import { shortCodeOf } from "./link-reference";

describe("shortCodeOf", () => {
  it("reads the code from every shape a reporter pastes", () => {
    expect(shortCodeOf("abc123")).toBe("abc123");
    expect(shortCodeOf("kurl.me/abc123")).toBe("abc123");
    expect(shortCodeOf("https://kurl.me/abc123")).toBe("abc123");
    expect(shortCodeOf("  https://kurl.me/abc123?utm_source=sms#top ")).toBe("abc123");
    expect(shortCodeOf("https://kurl.me/abc123+")).toBe("abc123");
    expect(shortCodeOf("https://kurl.me/abc123/")).toBe("abc123");
  });

  it("refuses what can't be a short code", () => {
    expect(shortCodeOf("")).toBeNull();
    expect(shortCodeOf("kurl.me/")).toBeNull();
    expect(shortCodeOf("ab")).toBeNull();
    expect(shortCodeOf("https://kurl.me/ko/report")).toBeNull();
    expect(shortCodeOf("https://kurl.me/abc-123")).toBeNull();
    expect(shortCodeOf("https://kurl.me/abcdefghijklmnopq")).toBeNull();
  });
});
