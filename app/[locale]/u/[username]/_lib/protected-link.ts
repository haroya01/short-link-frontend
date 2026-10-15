import type { PublicProfileEntry } from "@/types";

export function isProtectedLink(entry: PublicProfileEntry): boolean {
  return entry.kind === "LINK" && (entry.protected === true || !entry.originalUrl);
}

export function protectedTitle(entry: PublicProfileEntry): string {
  return entry.ogTitle || (entry.shortUrl ?? "").replace(/^https?:\/\//, "");
}
