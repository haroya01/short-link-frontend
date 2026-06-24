import { describe, expect, it } from "vitest";

import { cleanPreview, markdownLead } from "@/modules/blog/lib/markdown-lead";

describe("markdownLead", () => {
  it("skips a malformed spaceless heading instead of leaking the raw '##'", () => {
    const md = "오늘의 글\n##digital circuit\n진짜 본문 문장.";
    const lead = markdownLead(md);
    expect(lead).not.toContain("#");
    expect(lead).toBe("오늘의 글");
  });

  it("still skips a normal '# heading ' with a space", () => {
    expect(markdownLead("# 제목\n본문 첫 줄")).toBe("본문 첫 줄");
  });
});

describe("cleanPreview", () => {
  it("drops heading markers leaked into a stored excerpt", () => {
    expect(cleanPreview("오늘의 글 ##digital circuit")).toBe("오늘의 글 digital circuit");
    expect(cleanPreview("#ㅋㅋㅋ 본문")).toBe("ㅋㅋㅋ 본문");
  });

  it("preserves '#' that isn't a marker (C#, a#b)", () => {
    expect(cleanPreview("C# 으로 작성")).toBe("C# 으로 작성");
    expect(cleanPreview("a#b")).toBe("a#b");
  });

  it("unescapes \\[ \\] from WYSIWYG serialization but keeps the brackets", () => {
    expect(cleanPreview("\\[HDL 1장\\] Testbench에서 Clock 생성하기")).toBe(
      "[HDL 1장] Testbench에서 Clock 생성하기",
    );
  });

  it("strips emphasis / link syntax and collapses whitespace", () => {
    expect(cleanPreview("**굵게** 그리고 [라벨](https://x.com)")).toBe("굵게 그리고 라벨");
  });

  it("handles null / undefined / empty", () => {
    expect(cleanPreview(null)).toBe("");
    expect(cleanPreview(undefined)).toBe("");
    expect(cleanPreview("")).toBe("");
  });
});
