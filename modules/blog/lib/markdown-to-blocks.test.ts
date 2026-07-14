import { describe, expect, it } from "vitest";

import { blocksToMarkdown, markdownToBlocks } from "./markdown-to-blocks";

describe("markdownToBlocks", () => {
  it("returns empty array for empty input", () => {
    expect(markdownToBlocks("")).toEqual([]);
    expect(markdownToBlocks("   \n  \n")).toEqual([]);
  });

  // Regression: an image line the image rule doesn't fully consume (a trailing caption, or a
  // half-typed `![`) is rejected by the paragraph guard too, so `i` never advanced → infinite loop →
  // permanent editor freeze on autosave. Each must now terminate and fall back to a PARAGRAPH.
  it("does not hang on an image line with a trailing caption", () => {
    expect(markdownToBlocks("![alt](http://x/y.png) some caption")).toEqual([
      { type: "PARAGRAPH", content: "![alt](http://x/y.png) some caption" },
    ]);
  });

  it("does not hang on a half-typed image", () => {
    expect(markdownToBlocks("![alt")).toEqual([{ type: "PARAGRAPH", content: "![alt" }]);
  });

  it("converts headings", () => {
    const blocks = markdownToBlocks("# Title\n## Section\n### Subsection");
    expect(blocks).toEqual([
      { type: "H1", content: "Title" },
      { type: "H2", content: "Section" },
      { type: "H3", content: "Subsection" },
    ]);
  });

  it("converts paragraph with multi-line", () => {
    const blocks = markdownToBlocks("Line one\nLine two\n\nNew paragraph");
    expect(blocks).toEqual([
      { type: "PARAGRAPH", content: "Line one\nLine two" },
      { type: "PARAGRAPH", content: "New paragraph" },
    ]);
  });

  it("converts blockquote", () => {
    const blocks = markdownToBlocks("> wisdom");
    expect(blocks).toEqual([{ type: "QUOTE", content: "wisdom" }]);
  });

  it("converts divider", () => {
    const blocks = markdownToBlocks("para\n\n---\n\nafter");
    expect(blocks).toEqual([
      { type: "PARAGRAPH", content: "para" },
      { type: "DIVIDER", content: null },
      { type: "PARAGRAPH", content: "after" },
    ]);
  });

  it("converts image alt+url", () => {
    const blocks = markdownToBlocks("![cover](https://cdn/x.png)");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("IMAGE");
    const parsed = JSON.parse(blocks[0].content!);
    expect(parsed).toEqual({ url: "https://cdn/x.png", alt: "cover" });
  });

  it("round-trips an image caption via the markdown title", () => {
    const md = '![«wide» 사진](https://cdn/x.png "어느 봄날, 도쿄")';
    const blocks = markdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("IMAGE");
    const parsed = JSON.parse(blocks[0].content!);
    expect(parsed).toEqual({
      url: "https://cdn/x.png",
      alt: "사진",
      width: "wide",
      caption: "어느 봄날, 도쿄",
    });
    // blocks → markdown emits the caption back as the image title.
    expect(blocksToMarkdown(blocks)).toBe(md);
  });

  it("keeps an image whose caption contains a double-quote (escaped title round-trips)", () => {
    // tiptap-markdown backslash-escapes a `"` inside the caption: `she said "hi"` → `"she said \"hi\""`.
    // Before, the parser's title group stopped at the first inner quote, the whole image match failed,
    // and the image degraded to a literal-text PARAGRAPH — the caption AND the image were lost.
    const md = '![p](https://cdn/x.png "she said \\"hi\\"")';
    const blocks = markdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("IMAGE");
    const parsed = JSON.parse(blocks[0].content!);
    expect(parsed).toEqual({ url: "https://cdn/x.png", alt: "p", caption: 'she said "hi"' });
    // Round-trips: block caption re-escapes back to the same markdown, re-parses to the same block.
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });

  it("groups bullet list", () => {
    const blocks = markdownToBlocks("- one\n- two\n- three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("LIST_BULLET");
    // New format = raw markdown (nesting-capable), not a JSON array.
    expect(blocks[0].content).toBe("- one\n- two\n- three");
  });

  it("groups numbered list", () => {
    const blocks = markdownToBlocks("1. first\n2. second");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("LIST_NUMBERED");
    expect(blocks[0].content).toBe("1. first\n2. second");
  });
});

describe("video embeds", () => {
  it("turns a standalone video URL (bare / autolink / link) into an EMBED block", () => {
    expect(markdownToBlocks("https://youtu.be/dQw4w9WgXcQ")).toEqual([
      { type: "EMBED", content: "https://youtu.be/dQw4w9WgXcQ" },
    ]);
    expect(markdownToBlocks("<https://www.youtube.com/watch?v=dQw4w9WgXcQ>")[0].type).toBe("EMBED");
    expect(markdownToBlocks("[clip](https://vimeo.com/123456789)")[0].type).toBe("EMBED");
  });

  it("turns a standalone non-video URL into an EMBED card too (velog-style)", () => {
    // The reader renders this as an OG link-preview card, matching the editor's inserted link card.
    expect(markdownToBlocks("https://example.com/article")[0].type).toBe("EMBED");
  });

  it("keeps a URL with surrounding text as an inline link (paragraph), not a card", () => {
    expect(markdownToBlocks("see https://example.com/article for more")[0].type).toBe("PARAGRAPH");
  });

  it("turns a standalone image URL into an IMAGE block, not a link card", () => {
    expect(
      markdownToBlocks(
        "https://paiza-webapp.s3.ap-northeast-1.amazonaws.com/studentjoboffer/35546/large-x.jpg",
      ),
    ).toEqual([
      {
        type: "IMAGE",
        content: JSON.stringify({
          url: "https://paiza-webapp.s3.ap-northeast-1.amazonaws.com/studentjoboffer/35546/large-x.jpg",
          alt: "",
        }),
      },
    ]);
    expect(markdownToBlocks("https://cdn.example.com/a/b.png?v=2&w=800")[0].type).toBe("IMAGE");
    expect(markdownToBlocks("<https://cdn.example.com/a/b.webp>")[0].type).toBe("IMAGE");
  });

  it("keeps a labeled link to an image as an EMBED (author meant a link)", () => {
    expect(markdownToBlocks("[my photo](https://cdn.example.com/a/b.jpg)")[0].type).toBe("EMBED");
  });

  it("splits a video URL out of surrounding text", () => {
    const blocks = markdownToBlocks("intro line\nhttps://youtu.be/dQw4w9WgXcQ\noutro line");
    expect(blocks.map((b) => b.type)).toEqual(["PARAGRAPH", "EMBED", "PARAGRAPH"]);
  });

  it("splits a bare image URL out of a preceding paragraph (own IMAGE block, not absorbed)", () => {
    const blocks = markdownToBlocks("intro line\nhttps://cdn.example.com/a/b.png\noutro line");
    expect(blocks.map((b) => b.type)).toEqual(["PARAGRAPH", "IMAGE", "PARAGRAPH"]);
  });

  it("roundtrips an EMBED block through markdown", () => {
    const blocks = markdownToBlocks("https://youtu.be/dQw4w9WgXcQ");
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });

  it("coalesces a multi-line blockquote into ONE QUOTE block (round-trips)", () => {
    const blocks = markdownToBlocks("> first line\n> second line");
    const quotes = blocks.filter((b) => b.type === "QUOTE");
    expect(quotes).toHaveLength(1);
    expect(quotes[0].content).toBe("first line\nsecond line");
    // The serializer prefixes every line, so it parses back to one QUOTE, not N adjacent quote boxes.
    expect(markdownToBlocks(blocksToMarkdown(blocks)).filter((b) => b.type === "QUOTE")).toHaveLength(1);
  });
});

describe("CODE blocks", () => {
  it("parses a fenced block into a CODE block with lang + code", () => {
    const blocks = markdownToBlocks("```js\nconst x = 1;\n```");
    expect(blocks).toEqual([
      { type: "CODE", content: JSON.stringify({ lang: "js", code: "const x = 1;" }) },
    ]);
  });

  it("keeps a blank line inside the code", () => {
    const [block] = markdownToBlocks("```\nconst a = 1;\n\nconst b = 2;\n```");
    expect(block.type).toBe("CODE");
    expect(JSON.parse(block.content!).code).toBe("const a = 1;\n\nconst b = 2;");
  });

  it("does NOT treat markdown-like lines inside a code block as their own blocks", () => {
    const blocks = markdownToBlocks("```\n- not a list\n# not a heading\n```");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("CODE");
    expect(blocks.some((b) => b.type === "H1" || b.type === "LIST_BULLET")).toBe(false);
  });

  it("separates a paragraph from a code block that follows it without a blank line", () => {
    const blocks = markdownToBlocks("intro text\n```\ncode\n```");
    expect(blocks.map((b) => b.type)).toEqual(["PARAGRAPH", "CODE"]);
    expect(blocks[0].content).toBe("intro text");
  });

  it("roundtrips a CODE block through markdown", () => {
    const blocks = markdownToBlocks("```ts\nlet n = 0;\n\nn += 1;\n```");
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });
});

describe("image width", () => {
  it("parses a wide-marked image and round-trips it", () => {
    const blocks = markdownToBlocks("![«wide» My photo](https://x/a.png)");
    expect(blocks).toEqual([
      { type: "IMAGE", content: JSON.stringify({ url: "https://x/a.png", alt: "My photo", width: "wide" }) },
    ]);
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });

  it("a plain image has no width", () => {
    const [block] = markdownToBlocks("![plain](https://x/b.png)");
    expect(JSON.parse(block.content!)).toEqual({ url: "https://x/b.png", alt: "plain" });
  });
});

describe("image align", () => {
  it("parses a left/right-aligned image and round-trips it", () => {
    const blocks = markdownToBlocks("![«left» My photo](https://x/a.png)");
    expect(blocks).toEqual([
      { type: "IMAGE", content: JSON.stringify({ url: "https://x/a.png", alt: "My photo", align: "left" }) },
    ]);
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });

  it("carries align alongside a width (half + right) and round-trips", () => {
    const blocks = markdownToBlocks("![«half» «right» p](https://x/c.png)");
    expect(JSON.parse(blocks[0].content!)).toEqual({ url: "https://x/c.png", alt: "p", width: "half", align: "right" });
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });

  it("a center-aligned block emits a clean image with no align marker (center is the default)", () => {
    // Author picked "center" (align:"center" in the block) → serialized markdown has no «center» marker,
    // and re-parsing yields a block with no align key (clean).
    const md = blocksToMarkdown([
      { type: "IMAGE", content: JSON.stringify({ url: "https://x/d.png", alt: "p", align: "center" }) },
    ]);
    expect(md).toBe("![p](https://x/d.png)");
    expect(JSON.parse(markdownToBlocks(md)[0].content!)).toEqual({ url: "https://x/d.png", alt: "p" });
  });
});

describe("TABLE blocks", () => {
  it("parses a GFM table into a TABLE block holding the raw markdown", () => {
    const md = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const blocks = markdownToBlocks(md);
    expect(blocks).toEqual([{ type: "TABLE", content: md }]);
  });

  it("does not mistake a single pipe line for a table", () => {
    const blocks = markdownToBlocks("a | b not a table");
    expect(blocks[0].type).toBe("PARAGRAPH");
  });

  it("roundtrips a TABLE block through markdown", () => {
    const blocks = markdownToBlocks("| h1 | h2 |\n| --- | --- |\n| x | y |");
    expect(markdownToBlocks(blocksToMarkdown(blocks))).toEqual(blocks);
  });
});

describe("blocksToMarkdown", () => {
  it("roundtrips basic content", () => {
    const md = "# Hello\n\nFirst paragraph.\n\n> a quote\n\n---\n\n- a\n- b";
    const blocks = markdownToBlocks(md);
    const back = blocksToMarkdown(blocks);
    // 정확히 같지는 않지만 parse 다시 했을 때 동일 블록
    expect(markdownToBlocks(back)).toEqual(blocks);
  });

  it("serializes image block", () => {
    const blocks = [
      { type: "IMAGE", content: JSON.stringify({ url: "https://x", alt: "a" }) },
    ];
    expect(blocksToMarkdown(blocks)).toBe("![a](https://x)");
  });
});
