import { useEffect, useSyncExternalStore } from "react";

let open = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMarkDockedComposer(active: boolean) {
  useEffect(() => {
    if (!active) return;
    open += 1;
    listeners.forEach((l) => l());
    return () => {
      open -= 1;
      listeners.forEach((l) => l());
    };
  }, [active]);
}

export function useDockedComposerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open > 0,
    () => false,
  );
}
