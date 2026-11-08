import { describe, expect, it } from "vitest";
import { routeAuthorTagVariant, routeTagFeedVariant } from "./blog-variants";

const at = (path: string) => new URL(`https://blog.kurl.me${path}`);

describe("routeAuthorTagVariant", () => {
  it("sends a tag-filtered author home to the per-request route, keeping the query", () => {
    const url = at("/ko/p/dohyun?tag=java");
    expect(routeAuthorTagVariant(url)).toBe(true);
    expect(url.pathname).toBe("/ko/p/dohyun/tag_filter");
    expect(url.searchParams.get("tag")).toBe("java");
  });

  it("leaves the bare author home on its cached route, including an empty tag", () => {
    for (const path of ["/ko/p/dohyun", "/ko/p/dohyun/", "/ko/p/dohyun?tag=", "/ko/p/dohyun?tag=%20"]) {
      const url = at(path);
      expect(routeAuthorTagVariant(url)).toBe(false);
      expect(url.pathname).toBe(new URL(`https://blog.kurl.me${path}`).pathname);
    }
  });

  it("ignores author sub-pages and posts", () => {
    for (const path of ["/ko/p/dohyun/series?tag=java", "/ko/p/dohyun/my-post?tag=java"]) {
      expect(routeAuthorTagVariant(at(path))).toBe(false);
    }
  });
});

describe("routeTagFeedVariant", () => {
  it("sends a sorted or notes view of a tag to the per-request route", () => {
    for (const [path, want] of [
      ["/ko/blog/tags/java?sort=trending", "/ko/blog/tags/java/browse"],
      ["/ja/blog/tags/java/?view=notes", "/ja/blog/tags/java/browse"],
    ]) {
      const url = at(path);
      expect(routeTagFeedVariant(url)).toBe(true);
      expect(url.pathname).toBe(want);
    }
  });

  it("leaves the bare tag feed and other blog routes alone", () => {
    for (const path of ["/ko/blog/tags/java", "/ko/blog/tags?sort=trending", "/ko/blog?sort=trending"]) {
      expect(routeTagFeedVariant(at(path))).toBe(false);
    }
  });
});
