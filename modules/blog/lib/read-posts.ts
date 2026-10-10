import { useSyncExternalStore } from "react";
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";

const KEY = "kurl:read-posts";
const CAP = 600;
const EMPTY: ReadonlySet<number> = new Set();

const isIdList = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number");

let order: number[] | null = null;
let snapshot: ReadonlySet<number> = EMPTY;
const listeners = new Set<() => void>();

function load(): number[] {
  if (order === null) {
    order = readStorageJson(KEY, isIdList, []);
    snapshot = new Set(order);
  }
  return order;
}

function publish() {
  snapshot = new Set(order ?? []);
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY) return;
  order = null;
  load();
  publish();
}

export function markPostRead(id: number): void {
  const ids = load();
  if (snapshot.has(id)) return;
  ids.push(id);
  if (ids.length > CAP) ids.splice(0, ids.length - CAP);
  writeStorageJson(KEY, ids);
  publish();
}

export function readPosts(): ReadonlySet<number> {
  load();
  return snapshot;
}

function subscribe(listener: () => void) {
  if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useIsPostRead(id: number | null | undefined): boolean {
  const set = useSyncExternalStore(subscribe, readPosts, () => EMPTY);
  return id != null && set.has(id);
}
