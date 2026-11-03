import { readStorageJson, removeStorageItem, writeStorageJson } from "@/lib/storage-json";

type Entry = { token: string };

const key = (slug: string) => `kurl:event-registration:${slug}`;

const isEntry = (value: unknown): value is Entry =>
  typeof value === "object" && value !== null && typeof (value as { token?: unknown }).token === "string";

export function rememberedRegistration(slug: string): string | null {
  return readStorageJson<Entry | null>(key(slug), isEntry, null)?.token ?? null;
}

export function rememberRegistration(slug: string, token: string): void {
  writeStorageJson<Entry>(key(slug), { token });
}

export function forgetRegistration(slug: string, token: string): void {
  if (rememberedRegistration(slug) === token) removeStorageItem(key(slug));
}
