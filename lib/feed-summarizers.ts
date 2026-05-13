/**
 * Per-block-type row-preview summarizers for the profile editor list. Each block stores its
 * payload as JSON (or markdown / plain string for the legacy shapes) in {@code
 * profile_block.content}; these helpers extract a short human-readable label to show in the
 * editor's reorderable row.
 *
 * <p>Extracted from {@code ProfileFeedEditor.tsx} so the editor component stays focused on
 * rendering + drag-and-drop and the pure parsing logic can be unit-tested in isolation. Every
 * helper swallows malformed JSON / missing fields and returns the empty string (or 0 for counts)
 * so the row never crashes on partial / legacy data.
 */

/**
 * Best-effort body extraction for TEXT rows. Accepts the JSON payload shape (PR #137) or the
 * legacy plain-markdown string — both render the same body text in the editor row.
 */
export function summarizeTextBody(content: string | null): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { body?: unknown };
    if (typeof parsed?.body === "string") return parsed.body;
    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Pulls a single string field out of the block's JSON content for a row-summary preview. */
export function summarizeJsonField(content: string | null, field: string): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    return typeof parsed?.[field] === "string" ? parsed[field] : "";
  } catch {
    return "";
  }
}

/** Title (or first item's name) + count for the PRODUCT_CARD row preview. */
export function productCardSummary(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    const title = typeof parsed?.title === "string" ? parsed.title : "";
    const count = Array.isArray(parsed?.items) ? parsed.items.length : 0;
    if (title) return `${title} · ${count}`;
    const first =
      Array.isArray(parsed?.items) && typeof parsed.items[0]?.name === "string"
        ? parsed.items[0].name
        : "";
    return first ? `${first} 외 ${count - 1}건` : "";
  } catch {
    return "";
  }
}

/** Event title + start date for the EVENT row preview. */
export function eventSummary(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
    const startsAt = typeof parsed?.startsAt === "string" ? parsed.startsAt : "";
    if (!title && !startsAt) return "";
    if (!startsAt) return title;
    const d = new Date(startsAt);
    if (Number.isNaN(d.getTime())) return title;
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return title ? `${title} · ${label}` : label;
  } catch {
    return "";
  }
}

/** Title (or provider host fallback) for the BOOKING row preview. */
export function bookingSummary(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
    if (title) return title;
    const url = typeof parsed?.url === "string" ? parsed.url.trim() : "";
    if (!url) return "";
    try {
      return new URL(url).host.replace(/^www\./, "");
    } catch {
      return url;
    }
  } catch {
    return "";
  }
}

/** Name (or address fallback) for the PLACE row preview. */
export function placeSummary(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    if (name) return name;
    const address = typeof parsed?.address === "string" ? parsed.address.trim() : "";
    return address;
  } catch {
    return "";
  }
}

/** Image count for the GALLERY row preview ("3장 사진" etc.). */
export function countGalleryImages(content: string | null): number {
  if (!content) return 0;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.images) ? parsed.images.length : 0;
  } catch {
    return 0;
  }
}
