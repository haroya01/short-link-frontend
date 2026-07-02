/**
 * Pure normalization for tag entry, shared by the write flow's chip inputs (publish dialog + canvas).
 * Mirrors the rules the native app adopted so a tag typed on web stores identically on iOS: drop the
 * commas that separate entries, strip a leading `#` (people paste "#태그"), trim, and cap the length.
 * No React/DOM deps so the rules are unit-testable and the two inputs can't drift apart.
 */

/** Longest a single tag may be — matches the app's cap. */
export const MAX_TAG_LEN = 40;
/** How many tags a post may carry. */
export const MAX_TAGS = 10;

/** Normalize a raw entry to its stored form (empty string = nothing worth adding). */
export function normalizeTag(raw: string, maxLen = MAX_TAG_LEN): string {
  return raw
    .replace(/,/g, "")
    .trim()
    .replace(/^#+/, "")
    .trim()
    .slice(0, maxLen);
}

/**
 * Append a normalized tag to the list, honoring the rules: skip empties, case-insensitive dedupe, and
 * the max cap. Returns the SAME array reference when nothing changed so callers can cheaply detect a
 * no-op (and avoid a spurious onChange).
 */
export function addTag(tags: string[], raw: string, max = MAX_TAGS, maxLen = MAX_TAG_LEN): string[] {
  const value = normalizeTag(raw, maxLen);
  if (!value) return tags;
  if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) return tags;
  if (tags.length >= max) return tags;
  return [...tags, value];
}
