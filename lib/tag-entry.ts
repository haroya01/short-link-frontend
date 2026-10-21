export type TagLimits = { max: number; maxLen: number };

/** Empty string means nothing worth adding. */
export function normalizeTag(raw: string, maxLen: number): string {
  return raw
    .replace(/,/g, "")
    .trim()
    .replace(/^#+/, "")
    .trim()
    .slice(0, maxLen);
}

/** Returns the same array when nothing changed, so a no-op never fires onChange. */
export function addTag(tags: string[], raw: string, { max, maxLen }: TagLimits): string[] {
  const value = normalizeTag(raw, maxLen);
  if (!value) return tags;
  if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) return tags;
  if (tags.length >= max) return tags;
  return [...tags, value];
}
