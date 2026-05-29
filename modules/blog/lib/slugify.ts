/**
 * Heading → anchor id. CJK-friendly (velog keeps Korean/Japanese in fragment anchors): we keep
 * letters (incl. CJK via the `\p{L}` class), digits and hyphens, strip common inline-markdown
 * tokens, and collapse whitespace to single hyphens. Not globally unique — duplicate headings
 * collide, which is acceptable for in-page TOC scrolling.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [label](url) → label
    .replace(/[`*_~#>]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
