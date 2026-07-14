import { describe, expect, it } from "vitest";

import { markdownToBlocks, blocksToMarkdown } from "@/modules/blog/lib/markdown-to-blocks";
import { extractExternalLinks, rewriteMarkdownLinks } from "@/modules/blog/lib/post-links";
import { firstImageUrl } from "@/modules/blog/lib/markdown-image";

/**
 * Write-pipeline adversarial + stress battery — the SAME fixture families that pin the backend
 * (PostWriteStressTest / PostDraftRevisionLifecycleTest) and the iOS editor (WriteV2Adversarial /
 * StressTests), so all three owners of the markdown dialect are held to one contract. Beyond
 * per-function unit tests, the point here is INTEGRATION: a complex document flows through
 * parse → serialize → parse (fixed point), link auto-shorten rewriting, image-width markers and
 * cover suggestion TOGETHER without one feature corrupting another.
 */

/** After one normalization pass the round trip must be a fixed point — a body that keeps
 *  morphing on every save puts the autosave loop into permanent dirty churn. */
function assertFixedPoint(markdown: string) {
  const once = blocksToMarkdown(markdownToBlocks(markdown));
  const twice = blocksToMarkdown(markdownToBlocks(once));
  expect(twice).toBe(once);
  return once;
}

const COMPLEX_MARKDOWN = [
  "# 제목 하나",
  "",
  "본문 **볼드**와 *이탤릭*, `코드`, [링크](https://example.com/a) 가 섞인 문단.",
  "",
  "## 목록과 중첩",
  "",
  "- 하나",
  "- 둘",
  "  - 둘의 하나",
  "",
  "1. 첫",
  "2. 둘",
  "",
  "> 인용 첫 줄",
  "> 인용 둘째 줄",
  "",
  "```swift",
  'let x = "hello"',
  "# 이건 제목이 아니라 코드다",
  "```",
  "",
  "---",
  "",
  '![«wide» «1200x800» 히어로](https://cdn.example/hero.png "커버 설명")',
  "",
  "| 이름 | 값 |",
  "| --- | ---: |",
  "| 파이프 \\| 이스케이프 | 42 |",
  "",
  "https://youtu.be/dQw4w9WgXcQ",
].join("\n");

describe("복합 문서 — 왕복 고정점과 기능 간 간섭 없음", () => {
  it("복합 문서가 왕복 고정점이다", () => {
    assertFixedPoint(COMPLEX_MARKDOWN);
  });

  it("블록 스트림이 기대한 종류로 선다 (임베드·이미지·표·코드 공존)", () => {
    const blocks = markdownToBlocks(COMPLEX_MARKDOWN);
    const types = blocks.map((b) => b.type);
    expect(types).toContain("H1");
    expect(types).toContain("LIST_BULLET");
    expect(types).toContain("LIST_NUMBERED");
    expect(types).toContain("QUOTE");
    expect(types).toContain("CODE");
    expect(types).toContain("DIVIDER");
    expect(types).toContain("IMAGE");
    expect(types).toContain("TABLE");
    expect(types).toContain("EMBED");
  });

  it("자동단축 후보는 인라인 링크뿐 — 임베드·이미지·코드 속 주소는 안 건드린다", () => {
    const links = extractExternalLinks(COMPLEX_MARKDOWN);
    expect(links).toEqual(["https://example.com/a"]);
  });

  it("링크 재작성은 그 링크만 바꾸고 나머지는 바이트 그대로", () => {
    const rewritten = rewriteMarkdownLinks(COMPLEX_MARKDOWN, {
      "https://example.com/a": "https://kurl.me/x1",
    });
    expect(rewritten).toContain("[링크](https://kurl.me/x1)");
    expect(rewritten).toContain("https://youtu.be/dQw4w9WgXcQ");
    expect(rewritten).toContain("https://cdn.example/hero.png");
    // 링크 하나만 달라진다 — 나머지 전부 동일.
    expect(rewritten.replace("https://kurl.me/x1", "https://example.com/a")).toBe(
      COMPLEX_MARKDOWN,
    );
    // 재작성 뒤에도 블록 구조가 흔들리지 않는다.
    expect(markdownToBlocks(rewritten).map((b) => b.type)).toEqual(
      markdownToBlocks(COMPLEX_MARKDOWN).map((b) => b.type),
    );
  });

  it("커버 제안은 본문 첫 이미지, 폭·치수 마커는 payload 필드로 분리된다", () => {
    expect(firstImageUrl(COMPLEX_MARKDOWN)).toBe("https://cdn.example/hero.png");
    const image = markdownToBlocks(COMPLEX_MARKDOWN).find((b) => b.type === "IMAGE");
    const payload = JSON.parse(image?.content ?? "{}") as {
      alt?: string;
      width?: string;
      naturalWidth?: number;
      naturalHeight?: number;
      caption?: string;
    };
    expect(payload.width).toBe("wide");
    expect(payload.naturalWidth).toBe(1200);
    expect(payload.naturalHeight).toBe(800);
    expect(payload.alt).toBe("히어로");
    expect(payload.caption).toBe("커버 설명");
  });

  it("인접한 글머리·번호 줄은 한 리스트 블록으로 접힌다(첫 줄 종류) — 계약 문서화", () => {
    const folded = markdownToBlocks("- 하나\n1. 둘\n- 셋");
    expect(folded).toHaveLength(1);
    expect(folded[0].type).toBe("LIST_BULLET");
  });
});

describe("못된 인라인 — 미닫힘 마커·깨진 문법도 고정점", () => {
  const cases = [
    "**닫히지 않은 볼드",
    "별표 * 하나",
    "`닫히지 않은 코드",
    "[라벨만](",
    "![이미지 같지만 아닌 것](url 에 공백)",
    "**",
    "*_*_*",
  ];
  for (const md of cases) {
    it(`고정점: ${JSON.stringify(md)}`, () => {
      assertFixedPoint(md);
    });
  }
});

describe("경계 구조 — 빈 것들과 마커만 남은 줄", () => {
  const cases = [
    ">",
    "> ",
    "```\n```",
    "---",
    "----------",
    "| a |\n| --- |",
    "![](https://cdn.example/x.png)",
  ];
  for (const md of cases) {
    it(`고정점: ${JSON.stringify(md)}`, () => {
      assertFixedPoint(md);
    });
  }

  it("코드펜스가 블록 마커를 삼킨다", () => {
    const md = "```\n# not heading\n- not list\n> not quote\n---\n```";
    const blocks = markdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("CODE");
    assertFixedPoint(md);
  });
});

describe("CRLF 붙여넣기 — \\r 가 블록 본문에 새면 안 된다", () => {
  it("CRLF 문서의 블록 내용에 \\r 가 없다", () => {
    const blocks = markdownToBlocks("# 제목\r\n\r\n본문 줄\r\n둘째 줄");
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    for (const block of blocks) {
      expect(block.content ?? "").not.toContain("\r");
    }
    assertFixedPoint("# 제목\r\n\r\n본문");
  });
});

describe("가혹 크기 — 이미지 100장·초대형 표·리스트 1000·10만 자", () => {
  it("이미지 100장(마커·캡션 포함) 왕복", () => {
    const md = Array.from({ length: 100 }, (_, i) => {
      const n = i + 1;
      const width = n % 3 === 0 ? "«wide» " : "";
      return `![${width}«120${n % 10}x800» 사진 ${n}](https://cdn.example/stress/${n}.png "캡션 ${n}")`;
    }).join("\n\n");
    const canonical = assertFixedPoint(md);
    expect(markdownToBlocks(canonical).filter((b) => b.type === "IMAGE")).toHaveLength(100);
  });

  it("40열 × 60행 표 왕복", () => {
    const cols = 40;
    const header = `| ${Array.from({ length: cols }, (_, c) => `열${c + 1}`).join(" | ")} |`;
    const sep = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
    const rows = Array.from(
      { length: 60 },
      (_, r) => `| ${Array.from({ length: cols }, (_, c) => `셀${r + 1}-${c + 1}`).join(" | ")} |`,
    ).join("\n");
    assertFixedPoint(`${header}\n${sep}\n${rows}`);
  });

  it("리스트 1000개(중첩 순환) — 정규화 1회 후 고정", () => {
    const lines = Array.from({ length: 1000 }, (_, i) => {
      const n = i + 1;
      const pad = "  ".repeat(n % 4);
      return n % 5 === 0 ? `${pad}- 글머리 ${n}` : `${pad}${(n % 3) + 1}. 항목 ${n}`;
    }).join("\n");
    const once = blocksToMarkdown(markdownToBlocks(lines));
    expect(blocksToMarkdown(markdownToBlocks(once))).toBe(once);
  });

  it("~10만 자 복합 문서가 제때(2s 상한) 고정점으로 돈다", () => {
    const paragraph = "가나다라마바사아자차카타파하 **볼드**와 `코드` 그리고 [링크](https://example.com/a) 를 담은 문단. ".repeat(
      20,
    );
    const parts: string[] = [];
    for (let i = 1; i <= 220; i++) {
      if (i % 5 === 0) parts.push(`## 소제목 ${i}`);
      else if (i % 5 === 1) parts.push(paragraph);
      else if (i % 5 === 2) parts.push(`- 항목 ${i}\n- 항목 ${i}-2`);
      else if (i % 5 === 3) parts.push(`> 인용 ${i}`);
      else parts.push(`![«1200x800» 사진 ${i}](https://cdn.example/s/${i}.png "캡션 ${i}")`);
    }
    const md = parts.join("\n\n");
    expect(md.length).toBeGreaterThan(60_000);

    const start = Date.now();
    assertFixedPoint(md);
    expect(Date.now() - start).toBeLessThan(2_000);
  });
});

describe("유니코드 가혹 — ZWJ 가족·결합자·RTL 이 전 블록을 통과", () => {
  it("유니코드 문서가 고정점이다", () => {
    const family = "👨‍👩‍👧‍👦";
    const combining = "가́나́";
    const rtl = "مرحبا بالعالم";
    const md = [
      `# 제목 ${family}`,
      "",
      `문단 ${combining} 과 **볼드 ${rtl}** 그리고 \`코드 ${family}\``,
      "",
      `- 항목 ${rtl}`,
      `1. 번호 ${combining}`,
      "",
      `> 인용 ${family}`,
      "",
      `| 셀 ${rtl} | 값 |`,
      "| --- | --- |",
      `| ${family} | ${combining} |`,
    ].join("\n");
    assertFixedPoint(md);
  });
});
