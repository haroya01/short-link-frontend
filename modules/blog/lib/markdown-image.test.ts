import { describe, expect, it } from "vitest";
import { firstImageUrl } from "@/modules/blog/lib/markdown-image";

describe("firstImageUrl", () => {
  it("returns the first image url in reading order", () => {
    const md = "# Title\n\nintro\n\n![one](https://cdn.kurl.me/a.png)\n\n![two](https://cdn.kurl.me/b.png)";
    expect(firstImageUrl(md)).toBe("https://cdn.kurl.me/a.png");
  });

  it("ignores an image title/caption when reading the url", () => {
    expect(firstImageUrl('![alt](https://cdn.kurl.me/a.png "캡션")')).toBe("https://cdn.kurl.me/a.png");
  });

  it("skips an image written inside a fenced code block", () => {
    const md = "```md\n![x](https://cdn.kurl.me/code.png)\n```\n\n![real](https://cdn.kurl.me/real.png)";
    expect(firstImageUrl(md)).toBe("https://cdn.kurl.me/real.png");
  });

  it("returns null when the body has no image", () => {
    expect(firstImageUrl("just [a link](https://example.com) and text")).toBeNull();
    expect(firstImageUrl("")).toBeNull();
  });
});
