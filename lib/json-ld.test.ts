import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("keeps author text from closing a structured-data script", () => {
    const data = {
      "@type": "Article",
      headline: '</script><img data-injected="true"><script>',
      author: { name: "</ScRiPt><p>author</p>" },
    };
    const root = document.createElement("template");
    root.innerHTML = `<script type="application/ld+json">${serializeJsonLd(data)}</script>`;

    expect(root.content.children).toHaveLength(1);
    expect(root.content.querySelector("[data-injected]")).toBeNull();
    expect(JSON.parse(root.content.querySelector("script")!.textContent!)).toEqual(data);
  });

  it("preserves multilingual text, URLs and literal escape sequences", () => {
    const data = {
      name: '한글・日本語 "quoted" < & >',
      url: "https://example.com/?a=1&b=2",
      description: "line\nnext\u2028line\u2029end \\u003c",
      items: [{ name: "<!-- comment -->" }],
    };
    expect(serializeJsonLd(data)).not.toContain("<");
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
