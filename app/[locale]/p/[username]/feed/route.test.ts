import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/blog/api/public-posts", () => ({
  listPublicPosts: async () => ({
    ok: true,
    data: {
      author: { id: 17, username: "hana", bio: null, avatarUrl: null },
      posts: [
        { slug: "open", title: "open title", excerpt: "open excerpt", publishedAt: "2026-05-15T00:00:00Z", tags: [] },
        { slug: "fol", title: "followers title", excerpt: null, publishedAt: "2026-05-14T00:00:00Z", tags: [], audience: "FOLLOWERS", locked: { reason: "FOLLOWERS" } },
        { slug: "pw", title: "password title", excerpt: null, publishedAt: "2026-05-13T00:00:00Z", tags: [], audience: "PASSWORD" },
        { slug: "geo", title: "region title", excerpt: null, publishedAt: "2026-05-12T00:00:00Z", tags: [], audience: "PUBLIC", regionRestricted: true },
        { slug: "link", title: "unlisted title", excerpt: null, publishedAt: "2026-05-11T00:00:00Z", tags: [], audience: "UNLISTED" },
      ],
    },
  }),
}));

import { GET } from "./route";

describe("an author's RSS", () => {
  it("carries only public posts without a country limit, since a feed reader's country is unknown", async () => {
    const res = await GET(new Request("https://blog.kurl.me/ko/p/hana/feed"), { params: Promise.resolve({ locale: "ko", username: "hana" }) });
    const xml = await res.text();
    expect(xml).toContain("open title");
    for (const hidden of ["followers title", "password title", "region title", "unlisted title"]) expect(xml).not.toContain(hidden);
  });
});
