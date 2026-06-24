/**
 * The first body paragraph as plain text — used to pre-fill the publish dialog's excerpt so the author
 * starts from the post's opening line and edits it, rather than facing an empty box. Skips leading
 * headings / lists / quotes / images / code fences / tables and stops at the first blank line after the
 * prose begins. Inline markdown (emphasis, code, links, images) is stripped to clean reading text.
 */
export function markdownLead(markdown: string, max = 200): string {
  const lines = markdown.split("\n");
  const collected: string[] = [];
  let inFence = false;
  for (const raw of lines) {
    const line = raw.trim();
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
    // A block marker (heading, quote, list, image, divider, table row) isn't prose — skip it while
    // searching for the lead, but once prose has started it ends the paragraph. Heading match drops
    // the required space so a malformed "##digital" (no space) is still treated as a heading, not
    // collected as prose with the raw '##' leaking into the preview.
    if (/^(#{1,6}|>\s|[-*+]\s|\d+\.\s|!\[|---$|\|)/.test(line)) {
      if (collected.length) break;
      continue;
    }
    collected.push(line);
  }
  const text = collected
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

/**
 * Strip stray markdown markers from an ALREADY-STORED title/excerpt so a one-line preview reads as
 * clean text — covers old rows whose excerpt captured raw markup (e.g. "오늘의 글 ##digital circuit").
 * Conservative on '#': only runs at a word start (after start/space) so "C#" and "a#b" survive.
 */
export function cleanPreview(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/(^|\s)#{1,6}(?=\S)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
