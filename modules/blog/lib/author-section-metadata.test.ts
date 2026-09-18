import { afterEach, describe, expect, it, vi } from "vitest";
import { authorSectionMetadata } from "./author-section-metadata";

afterEach(() => vi.unstubAllEnvs());

describe("author section metadata", () => {
  it.each(["about", "collections"] as const)("gives %s its own blog canonical and social card", (section) => {
    vi.stubEnv("NEXT_PUBLIC_BLOG_HOST", "blog.kurl.me");
    const metadata = authorSectionMetadata({ get: () => "internal.vercel.app" }, "writer", section);
    const url = `https://blog.kurl.me/@writer/${section}`;
    expect(metadata.alternates).toEqual({ canonical: url });
    expect(metadata.openGraph).toMatchObject({ url, siteName: "@writer", images: [] });
    expect(metadata.twitter).toMatchObject({ title: metadata.title, images: [] });
    expect(metadata.description).toBeNull();
  });

  it("uses the author's bio for the about snippet", () => {
    const metadata = authorSectionMetadata({ get: () => "blog.kurl.me" }, "writer", "about", "Writer bio");
    expect(metadata.description).toBe("Writer bio");
    expect(metadata.openGraph).toMatchObject({ description: "Writer bio" });
  });
});
