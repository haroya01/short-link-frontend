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

// Lone Korean jamo — a standalone consonant (ㄱ–ㅎ) or vowel (ㅏ–ㅣ) that never composed into a
// syllable. These leak in from half-finished IME input ("#ㄴ") and are noise, not topics.
const JAMO = /[ㄱ-ㅣ]/u;

/**
 * Whether a stored tag is worth rendering as a discovery chip / hashtag. Filters the junk that slips
 * past entry validation (legacy data, IME accidents, keyboard-mash): incomplete Korean jamo, a single
 * lone character, and single-glyph repeats like "dddd" or "ㅋㅋㅋ". Applied at the READ side (feed /
 * post meta / tag strips) so a bad tag never becomes a clickable, indexable link — the write side owns
 * {@link normalizeTag}. Not a substitute for backend validation; a defensive display guard.
 */
export function isDisplayableTag(raw: string): boolean {
  const tag = raw.trim();
  if (tag.length < 2) return false; // empty or single character (covers a lone "ㄴ", "a", "書")
  // Uses only the Unicode compatibility-jamo block → an incomplete syllable, never a real word.
  if ([...tag].every((ch) => JAMO.test(ch))) return false;
  // A single glyph repeated ("dddd", "ㅋㅋㅋ", "....") — filler, not a topic. `Array.from` so a
  // surrogate-pair emoji counts as one glyph rather than two code units.
  const glyphs = Array.from(tag);
  if (glyphs.every((ch) => ch === glyphs[0])) return false;
  return true;
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
