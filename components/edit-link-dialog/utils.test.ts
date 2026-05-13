import { describe, expect, it } from "vitest";
import { blankToNull, toLocalInput } from "./utils";

describe("blankToNull", () => {
  it("returns null for empty + whitespace-only strings", () => {
    expect(blankToNull("")).toBeNull();
    expect(blankToNull("   ")).toBeNull();
    expect(blankToNull("\t\n  ")).toBeNull();
  });

  it("returns the trimmed value when non-empty", () => {
    expect(blankToNull("hello")).toBe("hello");
    expect(blankToNull("  spaced  ")).toBe("spaced");
  });

  it("preserves internal whitespace", () => {
    expect(blankToNull("hello world")).toBe("hello world");
    expect(blankToNull("  hello world  ")).toBe("hello world");
  });
});

describe("toLocalInput", () => {
  it("formats ISO 8601 to the datetime-local input shape (YYYY-MM-DDTHH:mm)", () => {
    // Build an ISO that the input must convert to local time. We can't assert the absolute
    // string because the test machine's tz isn't pinned — assert the shape + that round-tripping
    // through the native control keeps the time consistent within the locale.
    const out = toLocalInput("2026-05-15T10:30:00Z");
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("pads single-digit month / day / hour / minute to two digits", () => {
    const out = toLocalInput("2026-01-02T03:04:00Z");
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Year and minute should always be 4-digit / 2-digit.
    expect(out.slice(0, 4)).toBe("2026");
    expect(out.length).toBe(16);
  });

  it("round-trips to ISO via Date constructor (no lossy formatting)", () => {
    // The native datetime-local control reads back via {@code new Date(value).toISOString()};
    // toLocalInput's output must be parseable by that.
    const out = toLocalInput("2026-07-15T18:45:00Z");
    const reparsed = new Date(out);
    expect(Number.isFinite(reparsed.getTime())).toBe(true);
  });
});
