import { readStorageJson, removeStorageItem, writeStorageJson } from "@/lib/storage-json";

export const POST_LOCKED_EVENT = "kurl:post-locked";

type StoredGrant = { grant: string; expiresAt: string };

const keys = new Map<number, string>();
let activePostId: number | null = null;

const grantKey = (postId: number) => `kurl:post-grant:${postId}`;

const isStoredGrant = (v: unknown): v is StoredGrant | null =>
  v === null ||
  (typeof v === "object" &&
    v !== null &&
    typeof (v as StoredGrant).grant === "string" &&
    typeof (v as StoredGrant).expiresAt === "string");

export function rememberPostKey(postId: number, key: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (key) keys.set(postId, key);
  activePostId = postId;
}

export function readPostGrant(postId: number, now = Date.now()): string | null {
  const stored = readStorageJson<StoredGrant | null>(grantKey(postId), isStoredGrant, null, { session: true });
  if (!stored) return null;
  const expires = Date.parse(stored.expiresAt);
  if (!Number.isFinite(expires) || expires <= now) {
    removeStorageItem(grantKey(postId), { session: true });
    return null;
  }
  return stored.grant;
}

export function savePostGrant(postId: number, grant: string, expiresAt: string): void {
  writeStorageJson<StoredGrant>(grantKey(postId), { grant, expiresAt }, { session: true });
  if (typeof window !== "undefined") activePostId = postId;
}

export function dropPostGrant(postId: number): void {
  removeStorageItem(grantKey(postId), { session: true });
}

export function postAccessHeaders(postId?: number | null): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const id = postId ?? activePostId;
  if (id == null) return undefined;
  const headers: Record<string, string> = {};
  const key = keys.get(id);
  if (key) headers["X-Post-Key"] = key;
  const grant = readPostGrant(id);
  if (grant) headers["X-Post-Grant"] = grant;
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export function withPostAccess(base: HeadersInit | undefined, postId?: number | null): HeadersInit | undefined {
  const access = postAccessHeaders(postId);
  if (!access) return base;
  return { ...Object.fromEntries(new Headers(base).entries()), ...access };
}

export function announcePostLocked(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POST_LOCKED_EVENT));
}

export function withoutPostKey(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("k")) return url;
    parsed.searchParams.delete("k");
    return parsed.toString();
  } catch {
    return url;
  }
}
