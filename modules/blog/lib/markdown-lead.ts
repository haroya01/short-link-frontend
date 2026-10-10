/**
 * The first body paragraph as plain text — used to pre-fill the publish dialog's excerpt so the author
 * starts from the post's opening line and edits it, rather than facing an empty box. Skips leading
 * headings / lists / quotes / code fences / tables, and lines that only label or link — a bold-only
 * line (`**목차**`), a table-of-contents label, a line of links — and stops at the first blank line after
 * the prose begins. Prose written right after leading images is kept. Inline markdown (emphasis, code,
 * links, images) is stripped to clean reading text.
 */
const BLOCK_MARKER = /^(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|---$|\|)/;
const LEADING_IMAGES = /^(?:!\[[^\]]*\]\([^)]*\)\s*)+/;
const EMPHASIS_ONLY = /^(\*{1,3}|_{1,3})(?=\S)((?:(?!\1).)+)\1\s*:?$/;
const TOC_LABEL = /^(?:목차|目次|contents|table of contents|toc)\s*:?$/i;
const LINKS = /\[[^\]]*\]\([^)]*\)|<[a-z][a-z0-9+.-]*:[^\s<>]+>|https?:\/\/\S+/gi;
const INVISIBLE = /[\u200b-\u200d\ufeff]/g;

function plain(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<([a-z][a-z0-9+.-]*:[^\s<>]+)>/gi, "$1")
    .replace(/[*`~]+/g, "")
    .replace(/(^|[^\p{L}\p{N}])_+/gu, "$1")
    .replace(/_+(?=[^\p{L}\p{N}]|$)/gu, "")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim();
}

function labelsOrLinksOnly(line: string): boolean {
  const text = plain(line);
  return (
    text === "" ||
    EMPHASIS_ONLY.test(line) ||
    TOC_LABEL.test(text) ||
    line.replace(LINKS, "").replace(/[\s·|,•/–—-]+/g, "") === ""
  );
}

export function markdownLead(markdown: string, max = 200): string {
  const lines = markdown.split("\n");
  const collected: string[] = [];
  let inFence = false;
  for (const raw of lines) {
    let line = raw.trim();
    if (/^(```|~~~)/.test(line)) {
      if (collected.length) break;
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line === "") {
      if (collected.length) break;
      continue;
    }
    line = line.replace(LEADING_IMAGES, "");
    // A block marker or a line that only labels or links isn't prose — skip it while searching for the
    // lead, but once prose has started it ends the paragraph.
    if (line === "" || BLOCK_MARKER.test(line) || labelsOrLinksOnly(line)) {
      if (collected.length) break;
      continue;
    }
    collected.push(line.replace(/\\$/, ""));
  }
  const text = plain(collected.join(" "));
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}
