import type { BlockInput } from "@/modules/blog/api/posts";
import { altWithWidth, parseImageAlt } from "@/modules/blog/lib/image-width";
import { kurlShortCode } from "@/modules/blog/lib/kurl-link";
import { planEmbed } from "@/modules/blog/lib/post-embed";

/**
 * A line that is just a video URL (bare, an `<autolink>`, or a `[text](url)` link) → return that
 * URL when it's an embeddable provider (YouTube / Vimeo). velog-style: drop a YouTube link on its
 * own line and it becomes a player. Other URLs return null and stay a normal paragraph/link.
 */
/** A backtick fence longer than any run of backticks in the code, so the code can't break out. */
export function fenceFor(code: string): string {
  const longest = (code.match(/`+/g) ?? []).reduce((m, s) => Math.max(m, s.length), 0);
  return "`".repeat(Math.max(3, longest + 1));
}

/** A pipe-led line whose next line is a GFM separator row (`| --- |`) — the start of a table. */
function isTableStart(line: string, next: string | undefined): boolean {
  if (!/^\s*\|/.test(line) || next == null) return false;
  const t = next.trim();
  return /^[\s|:-]+$/.test(t) && t.includes("-") && t.includes("|");
}

/**
 * A line that is just a single URL (bare, an `<autolink>`, or a `[text](url)` link) and is
 * embeddable on its own → return that URL. Embeddable = a video provider (YouTube / Vimeo) or a
 * kurl short link (rendered as a live link-stats card). Other URLs stay a normal paragraph.
 */
function standaloneEmbedUrl(line: string): string | null {
  const t = line.trim();
  const m =
    t.match(/^<(https?:\/\/[^>\s]+)>$/) ||
    t.match(/^\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/) ||
    t.match(/^(https?:\/\/\S+)$/);
  if (!m) return null;
  const url = m[1];
  if (kurlShortCode(url)) return url;
  const plan = planEmbed(url);
  return plan && (plan.kind === "video" || plan.kind === "map") ? url : null;
}

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

    // Fenced code block → CODE block { lang, code }. Consume the whole region (incl. blank lines and
    // markdown-like lines), so the line-based rules below can't tear it apart.
    const fence = line.match(/^(```+|~~~+)(.*)$/);
    if (fence) {
      const marker = fence[1][0].repeat(3);
      const lang = fence[2].trim().split(/\s+/)[0] || null;
      const code: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trimStart().startsWith(marker)) {
          i++;
          break;
        }
        code.push(lines[i]);
        i++;
      }
      blocks.push({ type: "CODE", content: JSON.stringify({ lang, code: code.join("\n") }) });
      continue;
    }

    // GFM table (header row + "| --- |" separator + body rows) → TABLE block holding the raw
    // markdown; the reader renders it through remark-gfm.
    if (isTableStart(line, lines[i + 1])) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      blocks.push({ type: "TABLE", content: rows.join("\n") });
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

    // One OR MORE images on a line (a side-by-side «half» pair serializes adjacent: `![a](u)![b](u)`)
    // → one IMAGE block each, so the 2-up row round-trips. Only when the line is *nothing but* images.
    const imgMatches = [...line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    if (imgMatches.length > 0 && line.replace(/!\[[^\]]*\]\([^)]+\)/g, "").trim() === "") {
      for (const im of imgMatches) {
        const { width, alt } = parseImageAlt(im[1]);
        blocks.push({
          type: "IMAGE",
          content: JSON.stringify({ url: im[2], alt, ...(width ? { width } : {}) }),
        });
      }
      i++;
      continue;
    }

    const embedUrl = standaloneEmbedUrl(line);
    if (embedUrl) {
      blocks.push({ type: "EMBED", content: embedUrl });
      i++;
      continue;
    }

    // A markdown list (bullet or numbered), possibly NESTED. Capture the whole list region as raw
    // markdown — including indented sub-items / continuation lines — so nesting round-trips (the
    // reader renders it via remark-gfm). Block type follows the first line. Stops at a blank line or
    // a non-indented non-list line. (Legacy lists stored as a JSON string array still render.)
    if (/^(?:[-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const listLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        (/^\s*(?:[-*]|\d+\.)\s+/.test(lines[i]) || /^\s+\S/.test(lines[i]))
      ) {
        listLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: ordered ? "LIST_NUMBERED" : "LIST_BULLET", content: listLines.join("\n") });
      continue;
    }

    // PARAGRAPH — 연속 non-empty 줄 묶음. Always consume the current line FIRST so `i` advances even
    // when that line is rejected by the guard below but matched no block rule above (e.g. an image
    // with a trailing caption `![a](u) text`, or a bare `> ` blockquote marker). Otherwise `i` would
    // never move and the outer while-loop spins forever — a permanent editor freeze on autosave.
    const paraLines: string[] = [lines[i]];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      lines[i].trim() !== "---" &&
      !/^(```|~~~)/.test(lines[i]) &&
      !isTableStart(lines[i], lines[i + 1]) &&
      !/^(#{1,3}\s|>\s|!\[|[-*]\s|\d+\.\s)/.test(lines[i]) &&
      !standaloneEmbedUrl(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "PARAGRAPH", content: paraLines.join("\n") });
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
            parts.push(`![${altWithWidth(parsed.alt ?? "", parsed.width)}](${parsed.url})`);
          }
        } catch {
          // ignore malformed
        }
        break;
      case "LIST_BULLET":
      case "LIST_NUMBERED": {
        if (!b.content) break;
        // New format = raw markdown (nesting-capable). Legacy = JSON array of flat strings.
        try {
          const items = JSON.parse(b.content);
          if (Array.isArray(items)) {
            parts.push(
              items
                .map((x: string, i: number) => (b.type === "LIST_NUMBERED" ? `${i + 1}. ${x}` : `- ${x}`))
                .join("\n"),
            );
            break;
          }
        } catch {
          // not JSON — already raw markdown
        }
        parts.push(b.content);
        break;
      }
      case "EMBED":
        // Emit the URL on its own line so it round-trips back to an EMBED block (markdownToBlocks
        // re-detects it). Content is normally the bare URL; tolerate legacy JSON {url}.
        if (b.content) {
          let url = b.content;
          try {
            const j = JSON.parse(b.content);
            if (j && typeof j.url === "string") url = j.url;
          } catch {
            // not JSON — content is the URL
          }
          parts.push(url);
        }
        break;
      case "CODE":
        try {
          const parsed = b.content ? JSON.parse(b.content) : null;
          const code = typeof parsed?.code === "string" ? parsed.code : "";
          const lang = typeof parsed?.lang === "string" ? parsed.lang : "";
          parts.push(`${fenceFor(code)}${lang}\n${code}\n${fenceFor(code)}`);
        } catch {
          // ignore malformed
        }
        break;
      case "TABLE":
        // Raw GFM markdown — round-trips straight back to a TABLE block.
        if (b.content) parts.push(b.content);
        break;
      case "CTA_REF":
        // Read-only placeholder preserved as-is (no markdown authoring path).
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
