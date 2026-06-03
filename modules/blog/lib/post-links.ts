/**
 * Pure helpers for finding and rewriting the hyperlinks an author wrote in a post's markdown body.
 * Used by the publish flow to auto-shorten external links through the kurl system (so every in-post
 * click is tracked) — see use-post-editor. No React/DOM deps so it's unit-testable and server-safe.
 *
 * Scope (deliberately conservative so we never mangle content):
 *  - Inline links `[text](url)` and autolinks `<https://…>` only — NOT bare/raw URLs.
 *  - Image embeds `![alt](url)` are skipped (images already live on kurl storage; shortening an
 *    <img> src would break it).
 *  - Matches inside fenced ``` ``` blocks and inline `code` are ignored.
 *  - Only http(s) targets that aren't already a kurl short link qualify (so re-publish is idempotent).
 */
import { kurlShortCode } from "@/modules/blog/lib/kurl-link";

// The `d` flag yields per-group match indices (m.indices) so we can locate the URL substring exactly.
const INLINE_LINK = /(!?)\[[^\]]*\]\(\s*([^()\s]+?)\s*(?:"[^"]*")?\)/gd;
const AUTOLINK = /<(https?:\/\/[^>\s]+)>/gd;

/** Blank out code regions (same length, newlines preserved) so link scans skip code without
 *  shifting any character offsets — the masked copy stays index-aligned with the original. */
function maskCode(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]+`/g, (m) => " ".repeat(m.length));
}

/** http(s) link that isn't already a kurl short link — the only kind we auto-shorten. */
export function isShortenableLink(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  return kurlShortCode(url) == null;
}

type Target = { url: string; start: number; end: number };

function scanTargets(md: string): Target[] {
  const masked = maskCode(md);
  const targets: Target[] = [];
  const passes: [RegExp, number, boolean][] = [
    [INLINE_LINK, 2, true], // group 2 = url; may be an image (group 1 === "!")
    [AUTOLINK, 1, false],
  ];
  for (const [re, group, mayBeImage] of passes) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(masked)) !== null) {
      if (mayBeImage && m[1] === "!") continue; // image embed — leave the src alone
      const indices = (m as RegExpExecArray & { indices?: Array<[number, number]> }).indices;
      const span = indices?.[group];
      if (!span) continue;
      targets.push({ url: m[group], start: span[0], end: span[1] });
    }
  }
  return targets;
}

/** Unique external (shortenable) link URLs an author wrote in the body, in first-seen order. */
export function extractExternalLinks(md: string): string[] {
  const seen = new Set<string>();
  for (const { url } of scanTargets(md)) {
    if (isShortenableLink(url) && !seen.has(url)) seen.add(url);
  }
  return [...seen];
}

/** Replace each original URL with its kurl short URL in the body's link targets (never in images,
 *  code, or prose). Untouched links and any URL absent from `map` are left exactly as written. */
export function rewriteMarkdownLinks(md: string, map: Record<string, string>): string {
  const targets = scanTargets(md)
    .filter((t) => map[t.url])
    .sort((a, b) => b.start - a.start); // back-to-front keeps earlier offsets valid as we splice
  let out = md;
  for (const t of targets) out = out.slice(0, t.start) + map[t.url] + out.slice(t.end);
  return out;
}
