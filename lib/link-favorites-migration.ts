import { getFavoriteLinks, resolveOwnedLinks, setLinkFavorite } from "./api/link-library";
import { readStorageJson, readStorageString, writeStorageString } from "./storage-json";
import type { MyLinksPage } from "@/types";

/** Resolve ownership before importing device-local IDs; never infer ownership from a cached row. */
export async function loadAccountFavorites(accountId: number, signal?: AbortSignal): Promise<MyLinksPage> {
  const marker = `kurl:link-favorites:migrated:${accountId}`;
  const existing = await getFavoriteLinks(signal);
  signal?.throwIfAborted();
  if (readStorageString(marker) === "1") return existing;
  const legacy = readStorageJson<string[]>("kurl:link-favorites", (value): value is string[] => Array.isArray(value) && value.every((code) => typeof code === "string"), []);
  const codes = [...new Set(legacy)].filter((code) => /^[a-zA-Z0-9_-]+$/.test(code));
  const saved = new Set(existing.items.map((item) => item.shortCode));
  let imported = false;
  // Bound URL size and server batch size; PUT is idempotent if an interrupted import is retried.
  for (let offset = 0; offset < codes.length; offset += 50) {
    signal?.throwIfAborted();
    const owned = await resolveOwnedLinks(codes.slice(offset, offset + 50), signal);
    for (const item of owned.items) {
      signal?.throwIfAborted();
      if (saved.has(item.shortCode)) continue;
      await setLinkFavorite(item.shortCode, true, signal);
      saved.add(item.shortCode);
      imported = true;
    }
  }
  signal?.throwIfAborted();
  writeStorageString(marker, "1");
  return imported ? getFavoriteLinks(signal) : existing;
}
