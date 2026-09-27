import { describe, expect, it } from "vitest";
import type { MyLink } from "@/types";
import { filterFavoriteLinks, linkDisplayName } from "./link-library-view";
const link = (shortCode: string, note: string, expiresAt: string | null = null): MyLink => ({ shortCode, note, originalUrl: "https://docs.example.com/page", shortUrl: `https://kurl.me/${shortCode}`, clickCount: 5, clicksLast7d: [], tags: ["docs"], createdAt: "2026-09-01T00:00:00Z", expiresAt });

describe("complete favorites library", () => {
  it("finds a named favorite beyond the first 50 links without pagination", () => {
    const items = Array.from({ length: 80 }, (_, index) => link(`c${index}`, index === 74 ? "Launch brief" : "General"));
    expect(filterFavoriteLinks(items, { q: "launch" }).map((item) => item.shortCode)).toEqual(["c74"]);
  });
  it("preserves saved favorite order while combining search, tag, and expiry filters", () => {
    const now = +new Date("2026-09-13T00:00:00Z");
    const items = [link("z", "Guide"), link("y", "Guide", "2026-09-14T00:00:00Z"), link("a", "Guide", "2026-09-12T00:00:00Z")];
    expect(filterFavoriteLinks(items, { q: "guide", tag: "docs", expiry: "ACTIVE" }, now).map((item) => item.shortCode)).toEqual(["z", "y"]);
    expect(filterFavoriteLinks(items, { expiry: "EXPIRING_SOON" }, now).map((item) => item.shortCode)).toEqual(["y"]);
  });
  it("uses an owner name with a meaningful destination fallback", () => {
    expect(linkDisplayName(link("code", "  Project plan  "))).toBe("Project plan");
    expect(linkDisplayName(link("code", ""))).toBe("docs.example.com");
  });
});
