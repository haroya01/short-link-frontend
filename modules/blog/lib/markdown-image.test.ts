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

  it("keeps a query string on the url (cover thumbnails carry ?w=…)", () => {
    expect(firstImageUrl("![a](https://cdn.kurl.me/a.png?w=1200&h=630)")).toBe(
      "https://cdn.kurl.me/a.png?w=1200&h=630",
    );
  });

  it("trims whitespace inside the parens", () => {
    expect(firstImageUrl("![a](  https://cdn.kurl.me/a.png  )")).toBe("https://cdn.kurl.me/a.png");
  });

  it("matches an image with an empty alt", () => {
    expect(firstImageUrl("![](https://cdn.kurl.me/a.png)")).toBe("https://cdn.kurl.me/a.png");
  });

  it("returns the image even when a plain link comes first (a link is not an embed)", () => {
    const md = "[read this](https://example.com)\n\n![cover](https://cdn.kurl.me/a.png)";
    expect(firstImageUrl(md)).toBe("https://cdn.kurl.me/a.png");
  });

  it("skips images inside MULTIPLE fenced blocks and finds the first real embed after them", () => {
    const md =
      "```js\n![x](https://cdn.kurl.me/1.png)\n```\n\nbetween\n\n```py\n![y](https://cdn.kurl.me/2.png)\n```\n\n![real](https://cdn.kurl.me/real.png)";
    expect(firstImageUrl(md)).toBe("https://cdn.kurl.me/real.png");
  });

  it("does not match a reference-style image (no inline url to use as a cover)", () => {
    const md = "![alt][ref]\n\n[ref]: https://cdn.kurl.me/a.png";
    expect(firstImageUrl(md)).toBeNull();
  });
});
