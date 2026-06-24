import { describe, expect, it } from "vitest";

import { externalImageUrlsFromHtml } from "@/modules/blog/lib/paste-images";

describe("externalImageUrlsFromHtml", () => {
  it("extracts an external img url from image-only html (the Notion paste case)", () => {
    const html = `<meta charset="utf-8"><img src="https://cdn.notion.so/secure/abc.png" alt="">`;
    const { urls, textIsEmpty } = externalImageUrlsFromHtml(html);
    expect(urls).toEqual(["https://cdn.notion.so/secure/abc.png"]);
    expect(textIsEmpty).toBe(true);
  });

  it("extracts multiple images in document order", () => {
    const html = `<div><img src="https://a.test/1.png"><img src="https://b.test/2.jpg"></div>`;
    expect(externalImageUrlsFromHtml(html).urls).toEqual([
      "https://a.test/1.png",
      "https://b.test/2.jpg",
    ]);
  });

  it("reports text present when the html mixes an image with real copy", () => {
    const html = `<p>읽어보세요 <img src="https://a.test/x.png"> 끝.</p>`;
    const { urls, textIsEmpty } = externalImageUrlsFromHtml(html);
    expect(urls).toEqual(["https://a.test/x.png"]);
    expect(textIsEmpty).toBe(false);
  });

  it("ignores non-http(s) srcs (data:, blob:, relative)", () => {
    const html = `<img src="data:image/png;base64,AAAA"><img src="blob:xyz"><img src="/local.png">`;
    const { urls } = externalImageUrlsFromHtml(html);
    expect(urls).toEqual([]);
  });

  it("returns empty for html with no images", () => {
    const { urls, textIsEmpty } = externalImageUrlsFromHtml("<p>just text</p>");
    expect(urls).toEqual([]);
    expect(textIsEmpty).toBe(false);
  });

  it("handles empty / blank input", () => {
    expect(externalImageUrlsFromHtml("")).toEqual({ urls: [], textIsEmpty: true });
  });
});
