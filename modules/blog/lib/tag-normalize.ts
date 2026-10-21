import type { TagLimits } from "@/lib/tag-entry";

/** Same caps as the iOS app, so a tag stores identically on both. */
export const MAX_TAG_LEN = 40;
export const MAX_TAGS = 10;
export const POST_TAG_LIMITS: TagLimits = { max: MAX_TAGS, maxLen: MAX_TAG_LEN };

// Lone Korean jamo — a standalone consonant (ㄱ–ㅎ) or vowel (ㅏ–ㅣ) that never composed into a
// syllable. These leak in from half-finished IME input ("#ㄴ") and are noise, not topics.
const JAMO = /[ㄱ-ㅣ]/u;

/** Read-side guard: junk that slipped past entry (legacy data, IME accidents) never becomes a link. */
export function isDisplayableTag(raw: string): boolean {
  const tag = raw.trim();
  if (tag.length < 2) return false; // empty or single character (covers a lone "ㄴ", "a", "書")
  if ([...tag].every((ch) => JAMO.test(ch))) return false;
  // `Array.from` so a surrogate-pair emoji counts as one glyph.
  const glyphs = Array.from(tag);
  if (glyphs.every((ch) => ch === glyphs[0])) return false;
  return true;
}
