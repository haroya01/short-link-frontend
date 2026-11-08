import { describe, expect, it, vi } from "vitest";

vi.mock("./_components/author-home", () => ({ AuthorHome: () => null, authorHomeMetadata: async () => ({}) }));
vi.mock("../../blog/tags/[tag]/_components/tag-feed", () => ({ TagFeed: () => null, tagFeedMetadata: async () => ({}) }));

// Vercel builds a dynamic segment as an ISR page only when generateStaticParams exists; without it the
// route ships as a plain per-request function even with `revalidate` set (next start caches it anyway).
describe("cached public pages on Vercel", () => {
  it("declare an empty param list so every author home and tag feed renders once, then caches", async () => {
    for (const page of [await import("./page"), await import("../../blog/tags/[tag]/page")]) {
      expect(page.generateStaticParams()).toEqual([]);
      expect(page.revalidate).toBe(30);
    }
  });
});
