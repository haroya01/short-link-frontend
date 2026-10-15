import { readStorageString } from "@/lib/storage-json";

export function mockFails(key: string): boolean {
  return readStorageString(`kurl:mock-fail:${key}`) === "1";
}
