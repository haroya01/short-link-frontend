import { describe, expect, it } from "vitest";
import { mockDiscoverConnections, mockHighlightFeed } from "./_mocks-collections";

// The global-fallback contract as the web decodes it: the personalized feeds carry a `source`
// ("following" | "global"); a page that came from the cold-start fallback ("global") must pin
// scope=global on follow-ups so pages never mix. These assert the mock honours that contract, which
// is what the components (highlights-feed / discover-connections) read to gate the §10 caption and
// the scope pin.

describe("discover global-fallback — mock contract", () => {
  it("mockDiscoverConnections reports the follow-graph source (mock viewer follows curators)", () => {
    const feed = mockDiscoverConnections();
    expect(feed.source).toBe("following");
    expect(feed.items.length).toBeGreaterThan(0);
  });

  it("mockHighlightFeed defaults to 'following' when no scope is pinned", () => {
    const page = mockHighlightFeed(0, 20);
    expect(page.source).toBe("following");
  });

  it("mockHighlightFeed reports 'global' once scope=global is pinned", () => {
    const page = mockHighlightFeed(1, 20, "global");
    expect(page.source).toBe("global");
  });

  it("a non-global scope does not flip the source to global", () => {
    const page = mockHighlightFeed(1, 20, "following");
    expect(page.source).toBe("following");
  });
});
