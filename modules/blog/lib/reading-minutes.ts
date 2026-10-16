import type { PublicPostBlock } from "@/modules/blog/api/public-posts";

function parseList(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return content.split("\n").filter(Boolean);
  }
  return [];
}

/** Rough read-time estimate from the textual blocks. CJK-leaning: ~500 chars/min. */
export function readingMinutes(blocks: PublicPostBlock[]): number {
  let chars = 0;
  for (const b of blocks) {
    if (!b.content) continue;
    if (b.type === "LIST_BULLET" || b.type === "LIST_NUMBERED") {
      chars += parseList(b.content).join(" ").length;
    } else if (["PARAGRAPH", "H1", "H2", "H3", "QUOTE"].includes(b.type)) {
      chars += b.content.length;
    }
  }
  return Math.max(1, Math.round(chars / 500));
}
