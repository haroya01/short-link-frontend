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

export function headingPlainText(text: string): string {
  return text
    .trim()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])[*_](?=\S)(.+?)(?<=\S)[*_](?![\w*])/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}

export function headingAnchors(texts: string[]): string[] {
  return texts.map((text, i) => {
    const slug = slugify(text);
    return /^[a-z0-9-]+$/.test(slug) ? slug : `section-${i + 1}`;
  });
}
