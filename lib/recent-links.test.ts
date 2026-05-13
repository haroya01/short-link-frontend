import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearClaimTokens,
  readPendingClaimTokens,
  recordRecent,
  type RecentLink,
} from "./recent-links";

const STORAGE_KEY = "kurl:recent-links:v1";

function reset() {
  window.localStorage.clear();
}

function makeLink(overrides: Partial<RecentLink> = {}): RecentLink {
  return {
    shortCode: "abc",
    shortUrl: "https://kurl.me/abc",
    originalUrl: "https://example.com/long",
    createdAt: Date.now(),
    claimToken: null,
    ...overrides,
  };
}

beforeEach(reset);
afterEach(reset);

describe("recordRecent", () => {
  it("inserts a new link at the head of the list", () => {
    recordRecent(makeLink({ shortCode: "a1" }));
    recordRecent(makeLink({ shortCode: "a2" }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored.map((s: RecentLink) => s.shortCode)).toEqual(["a2", "a1"]);
  });

  it("dedups by shortCode — re-recording moves the entry back to the head", () => {
    recordRecent(makeLink({ shortCode: "a1", originalUrl: "https://example.com/v1" }));
    recordRecent(makeLink({ shortCode: "a2" }));
    recordRecent(makeLink({ shortCode: "a1", originalUrl: "https://example.com/v2" }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored.map((s: RecentLink) => s.shortCode)).toEqual(["a1", "a2"]);
    // The latest version of a1 wins (originalUrl reflects the most recent record).
    expect(stored[0].originalUrl).toBe("https://example.com/v2");
  });

  it("caps the list at 10 items — older entries fall off the tail", () => {
    for (let i = 0; i < 15; i++) {
      recordRecent(makeLink({ shortCode: `code-${i}`, createdAt: Date.now() + i }));
    }
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored.length).toBe(10);
    // Newest (14) at head, items 0–4 dropped.
    expect(stored[0].shortCode).toBe("code-14");
    expect(stored.find((s: RecentLink) => s.shortCode === "code-0")).toBeUndefined();
  });
});

describe("readPendingClaimTokens", () => {
  it("returns claim tokens of stored links — skipping nulls and blanks", () => {
    recordRecent(makeLink({ shortCode: "a1", claimToken: "tok-1" }));
    recordRecent(makeLink({ shortCode: "a2", claimToken: null }));
    recordRecent(makeLink({ shortCode: "a3", claimToken: "tok-3" }));
    const tokens = readPendingClaimTokens();
    expect(tokens.sort()).toEqual(["tok-1", "tok-3"]);
  });

  it("returns empty when storage is empty or malformed", () => {
    expect(readPendingClaimTokens()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY, "not json");
    expect(readPendingClaimTokens()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(readPendingClaimTokens()).toEqual([]);
  });

  it("filters out entries older than the 24h anonymous TTL", () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    // Write directly to storage so we can backdate the entry — recordRecent always uses now.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { ...makeLink({ shortCode: "fresh", claimToken: "tok-fresh" }), createdAt: now },
        { ...makeLink({ shortCode: "old", claimToken: "tok-old" }), createdAt: now - dayMs - 1 },
      ]),
    );
    expect(readPendingClaimTokens()).toEqual(["tok-fresh"]);
  });
});

describe("clearClaimTokens", () => {
  it("clears claim tokens for the supplied ids and leaves others intact", () => {
    recordRecent(makeLink({ shortCode: "a1", claimToken: "tok-1" }));
    recordRecent(makeLink({ shortCode: "a2", claimToken: "tok-2" }));
    clearClaimTokens(["tok-1"]);
    const remaining = readPendingClaimTokens();
    expect(remaining).toEqual(["tok-2"]);
  });

  it("is a no-op when the cleared set is empty", () => {
    recordRecent(makeLink({ shortCode: "a1", claimToken: "tok-1" }));
    clearClaimTokens([]);
    expect(readPendingClaimTokens()).toEqual(["tok-1"]);
  });

  it("preserves the rest of the link record when clearing a token", () => {
    recordRecent(
      makeLink({
        shortCode: "a1",
        shortUrl: "https://kurl.me/a1",
        originalUrl: "https://example.com",
        claimToken: "tok-1",
      }),
    );
    clearClaimTokens(["tok-1"]);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored[0]).toMatchObject({
      shortCode: "a1",
      shortUrl: "https://kurl.me/a1",
      originalUrl: "https://example.com",
      claimToken: null,
    });
  });
});
