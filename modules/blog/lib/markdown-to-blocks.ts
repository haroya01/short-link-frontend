import type { BlockInput } from "@/modules/blog/api/posts";

/**
 * Markdown 텍스트를 PostBlock 배열로 변환. v0 minimal editor 용. block-based 에디터 (B2) 구현 전까지 의미적 mapping
 * 만 처리. 정밀한 markdown parser 가 아니므로 syntax 코너 케이스 (nested list / code block / link 등) 는 적당히 폴백.
 *
 * 매핑:
 * - `# `, `## `, `### ` → H1 / H2 / H3
 * - `> ` → QUOTE
 * - `- ` 줄 연속 → LIST_BULLET (content = JSON array)
 * - `1. ` 줄 연속 → LIST_NUMBERED
 * - `![alt](url)` 단독 → IMAGE
 * - `---` 단독 → DIVIDER
 * - 기타 → PARAGRAPH
 *
 * 빈 줄은 블록 구분자.
 */
export function markdownToBlocks(markdown: string): BlockInput[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split("\n");
  const blocks: BlockInput[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.trim() === "---") {
      blocks.push({ type: "DIVIDER", content: null });
      i++;
      continue;
    }

    let m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      blocks.push({ type: `H${level}`, content: m[2].trim() });
      i++;
      continue;
    }

    m = line.match(/^>\s*(.+)$/);
    if (m) {
      blocks.push({ type: "QUOTE", content: m[1].trim() });
      i++;
      continue;
    }

    m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (m) {
      blocks.push({
        type: "IMAGE",
        content: JSON.stringify({ url: m[2], alt: m[1] }),
      });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "LIST_BULLET", content: JSON.stringify(items) });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "LIST_NUMBERED", content: JSON.stringify(items) });
      continue;
    }

    // PARAGRAPH — 연속 non-empty 줄 묶음
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      lines[i].trim() !== "---" &&
      !/^(#{1,3}\s|>\s|!\[|[-*]\s|\d+\.\s)/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "PARAGRAPH", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

/** Block 배열을 다시 markdown 으로 직렬화 (편집 시 load). */
export function blocksToMarkdown(blocks: { type: string; content: string | null }[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "H1":
        parts.push(`# ${b.content ?? ""}`);
        break;
      case "H2":
        parts.push(`## ${b.content ?? ""}`);
        break;
      case "H3":
        parts.push(`### ${b.content ?? ""}`);
        break;
      case "QUOTE":
        parts.push(`> ${b.content ?? ""}`);
        break;
      case "DIVIDER":
        parts.push("---");
        break;
      case "IMAGE":
        try {
          const parsed = b.content ? JSON.parse(b.content) : null;
          if (parsed && typeof parsed.url === "string") {
            parts.push(`![${parsed.alt ?? ""}](${parsed.url})`);
          }
        } catch {
          // ignore malformed
        }
        break;
      case "LIST_BULLET":
        try {
          const items = b.content ? JSON.parse(b.content) : [];
          if (Array.isArray(items)) {
            parts.push(items.map((x: string) => `- ${x}`).join("\n"));
          }
        } catch {
          // ignore
        }
        break;
      case "LIST_NUMBERED":
        try {
          const items = b.content ? JSON.parse(b.content) : [];
          if (Array.isArray(items)) {
            parts.push(items.map((x: string, i: number) => `${i + 1}. ${x}`).join("\n"));
          }
        } catch {
          // ignore
        }
        break;
      case "CTA_REF":
      case "EMBED":
        // v0 minimal 에디터 에선 직접 편집 X. read-only placeholder 로 보존.
        if (b.content) parts.push(b.content);
        break;
      case "PARAGRAPH":
      default:
        if (b.content) parts.push(b.content);
        break;
    }
  }
  return parts.join("\n\n");
}
