import type { MyLink } from "@/types";
import type { MyLinksFilters } from "./api/links";

export function linkDisplayName(link: MyLink): string {
  if (link.note?.trim()) return link.note.trim();
  try { return new URL(link.originalUrl).hostname; } catch { return `/${link.shortCode}`; }
}

/** Favorites have a complete source; filters must not accidentally use a loaded all-links page. */
export function filterFavoriteLinks(items: MyLink[], filters: MyLinksFilters, now = Date.now()): MyLink[] {
  const q = filters.q?.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (q && !`${item.note ?? ""} ${item.shortCode} ${item.originalUrl}`.toLocaleLowerCase().includes(q)) return false;
    if (filters.tag && !item.tags.includes(filters.tag)) return false;
    if (filters.domain) {
      if (!item.originalUrl.toLocaleLowerCase().includes(filters.domain.trim().toLocaleLowerCase())) return false;
    }
    if (filters.createdAfter && new Date(item.createdAt) < new Date(filters.createdAfter)) return false;
    if (filters.createdBefore && new Date(item.createdAt) > new Date(filters.createdBefore)) return false;
    const expiry = item.expiresAt ? +new Date(item.expiresAt) : null;
    if (filters.expiry === "NEVER" && expiry !== null) return false;
    if (filters.expiry === "HAS_EXPIRY" && expiry === null) return false;
    if (filters.expiry === "EXPIRED" && (expiry === null || expiry >= now)) return false;
    if (filters.expiry === "ACTIVE" && expiry !== null && expiry < now) return false;
    if (filters.expiry === "EXPIRING_SOON" && (expiry === null || expiry < now || expiry >= now + 3 * 86400000)) return false;
    return true;
  });
}
