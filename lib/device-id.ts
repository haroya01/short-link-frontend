import { readToken } from "@/lib/api/client";
import { readStorageString, writeStorageString } from "@/lib/storage-json";

const DEVICE_KEY = "kurl:device-id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEVICE_HEADER = "X-Kurl-Device";

function deviceId(): string | null {
  const stored = readStorageString(DEVICE_KEY);
  if (stored && UUID.test(stored)) return stored;
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return null;
  writeStorageString(DEVICE_KEY, crypto.randomUUID());
  const kept = readStorageString(DEVICE_KEY);
  return kept && UUID.test(kept) ? kept : null;
}

export function viewerHeaders(): Record<string, string> {
  if (readToken()) return {};
  const id = deviceId();
  return id ? { [DEVICE_HEADER]: id } : {};
}
