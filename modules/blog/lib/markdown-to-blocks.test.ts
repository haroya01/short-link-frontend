import { describe, expect, it } from "vitest";

import { blocksToMarkdown, markdownToBlocks } from "./markdown-to-blocks";

describe("markdownToBlocks", () => {
  it("returns empty array for empty input", () => {
    expect(markdownToBlocks("")).toEqual([]);
    expect(markdownToBlocks("   \n  \n")).toEqual([]);
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

  it("groups bullet list", () => {
    const blocks = markdownToBlocks("- one\n- two\n- three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("LIST_BULLET");
    expect(JSON.parse(blocks[0].content!)).toEqual(["one", "two", "three"]);
  });

  it("groups numbered list", () => {
    const blocks = markdownToBlocks("1. first\n2. second");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("LIST_NUMBERED");
    expect(JSON.parse(blocks[0].content!)).toEqual(["first", "second"]);
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

  it("leaves a non-video URL as a paragraph", () => {
    expect(markdownToBlocks("https://example.com/article")[0].type).toBe("PARAGRAPH");
  });

  it("splits a video URL out of surrounding text", () => {
    const blocks = markdownToBlocks("intro line\nhttps://youtu.be/dQw4w9WgXcQ\noutro line");
    expect(blocks.map((b) => b.type)).toEqual(["PARAGRAPH", "EMBED", "PARAGRAPH"]);
  });

  it("roundtrips an EMBED block through markdown", () => {
    const blocks = markdownToBlocks("https://youtu.be/dQw4w9WgXcQ");
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
