import type { MyLink } from "@/types";
import type { MyLinksFilters } from "./api/links";
import { linkExpiry } from "./link-expiry";

export type LinkNameSource = {
  shortCode: string;
  originalUrl: string;
  note?: string | null;
  ogTitle?: string | null;
  ogTitleOverride?: string | null;
};

export function linkDisplayName(link: LinkNameSource): string {
  const named = link.note?.trim() || link.ogTitleOverride?.trim() || link.ogTitle?.trim();
  if (named) return named;
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
    const expiry = linkExpiry(item.expiresAt, { now });
    if (filters.expiry === "NEVER" && expiry !== null) return false;
    if (filters.expiry === "HAS_EXPIRY" && expiry === null) return false;
    if (filters.expiry === "EXPIRED" && expiry?.kind !== "expired") return false;
    if (filters.expiry === "ACTIVE" && expiry?.kind === "expired") return false;
    if (filters.expiry === "EXPIRING_SOON" && expiry?.kind !== "soon") return false;
    return true;
  });
}
