import { useSyncExternalStore } from "react";

let translated = false;
const listeners = new Set<() => void>();

export function setPostTranslated(next: boolean) {
  if (translated === next) return;
  translated = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePostTranslated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => translated,
    () => false,
  );
}
