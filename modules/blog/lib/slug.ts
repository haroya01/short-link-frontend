/**
 * Post slug normalization, aligned with the backend rule `^[a-z0-9]+(?:-[a-z0-9]+)*$`
 * (lowercase alphanumeric segments joined by single hyphens — no leading/trailing/repeated hyphens).
 */

/**
 * Live-input normalization. Lowercases, turns invalid chars into hyphens, collapses runs, and drops
 * a leading hyphen. A trailing hyphen is intentionally left so typing "a-" → "a-b" works; it is
 * trimmed by {@link slugForSave} before the value is sent.
 */
export function normalizeSlugInput(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "");
}

/** Fully valid slug for persistence — input normalization plus a trailing-hyphen trim. */
export function slugForSave(v: string): string {
  return normalizeSlugInput(v).replace(/-+$/, "");
}
