import { describe, expect, it } from "vitest";
import { markdownLead } from "./markdown-lead";

describe("markdownLead", () => {
  it("passes over a bold table of contents and its list to the first real paragraph", () => {
    const body = [
      "**목차**",
      "",
      "1. DATA_IO module",
      "",
      "2. restart를 하는 이유",
      "",
      "**\u200b**",
      "",
      "**1. DATA_IO module**",
      "",
      "![«546x588» image.png](https://cdn.example/a.png)![«558x387» image.png](https://cdn.example/b.png)DATA_IO module은 BRAM에서 데이터를 받아와 **data_x, data_y**로 출력하도록 하였다.",
      "",
      "또한, 출력되는 첫 세개의 데이터를 최초 means값으로 설정하였다.",
    ].join("\n");
    expect(markdownLead(body)).toBe("DATA_IO module은 BRAM에서 데이터를 받아와 data_x, data_y로 출력하도록 하였다.");
  });

  it.each([
    ["a bold-only label", "**들어가며**"],
    ["an italic-only label with a colon", "_요약_:"],
    ["a plain table-of-contents label", "Table of Contents:"],
    ["a line of links", "[소개](#intro) · [설치](#install) · [사용](#usage)"],
    ["a bare link", "https://example.com/post"],
    ["a link kept as a link", "<https://example.com/post>"],
    ["an image alone", "![cover](https://cdn.example/c.png)"],
  ])("skips %s", (_, line) => {
    expect(markdownLead(`${line}\n\n본문의 첫 문단이다.`)).toBe("본문의 첫 문단이다.");
  });

  it("keeps a line that only starts in bold", () => {
    expect(markdownLead("**주의**: 오래된 버전 기준이다.\n\n다음 문단")).toBe("주의: 오래된 버전 기준이다.");
  });

  it("keeps a line with two bold words and plain text between them", () => {
    expect(markdownLead("**A** 와 **B** 를 비교한다.")).toBe("A 와 B 를 비교한다.");
  });

  it("skips headings and code, and stops at the first blank line", () => {
    const body = "# 제목\n\n```\ncode\n```\n\n첫 줄\n이어지는 줄\n\n둘째 문단";
    expect(markdownLead(body)).toBe("첫 줄 이어지는 줄");
  });

  it("reads soft line breaks as spaces, not as a backslash", () => {
    expect(markdownLead("첫 줄\\\n둘째 줄\n\n다음 문단")).toBe("첫 줄 둘째 줄");
  });

  it("shows a pasted address as the address, without the angle brackets", () => {
    expect(markdownLead("자세한 건 <https://example.com/keep> 에서")).toBe("자세한 건 https://example.com/keep 에서");
  });

  it("cuts a long lead at the limit", () => {
    expect(markdownLead("가".repeat(10), 4)).toBe("가가가가…");
  });
});
