import { describe, expect, it } from "vitest";
import { parsePublicFeed, type PublicFeedEntryShape } from "./parse-public-feed";

const link = (shortCode: string, highlighted = false): PublicFeedEntryShape => ({
  kind: "LINK",
  id: null,
  shortCode,
  highlighted,
});
const block = (kind: PublicFeedEntryShape["kind"], id: number, highlighted: boolean | null = null): PublicFeedEntryShape => ({
  kind,
  id,
  shortCode: null,
  highlighted,
  content: "{}",
});

describe("parsePublicFeed featured slot", () => {
  it("reads a featured link", () => {
    const parsed = parsePublicFeed([link("a"), link("b", true), block("EVENT", 3, false)]);
    expect(parsed.highlightedShortCode).toBe("b");
    expect(parsed.highlightedBlockId).toBeNull();
  });

  it("reads a featured event or product block", () => {
    expect(parsePublicFeed([link("a"), block("EVENT", 3, true)]).highlightedBlockId).toBe(3);
    expect(parsePublicFeed([block("PRODUCT_CARD", 4, true)]).highlightedBlockId).toBe(4);
  });

  it("ignores highlight flags on kinds that can't be featured", () => {
    const parsed = parsePublicFeed([block("TEXT", 5, true), block("PLACE", 6, true)]);
    expect(parsed.highlightedBlockId).toBeNull();
    expect(parsed.highlightedShortCode).toBeNull();
  });
});
