/**
 * A module-level "set of ids the signed-in user has marked" store, shared by every card on a feed so
 * dropping a toggle button on each card doesn't fire one status request per card (N+1). The first
 * mounted card triggers a single {@link load}; every card reads its state from the resulting set, and
 * toggling updates the set optimistically so all cards for the same id stay in sync.
 *
 * Factored out of the bookmark + series-subscription hooks, which were byte-for-byte the same store
 * modulo the id type (`username/slug` string vs series-id number) and the load/mutate endpoints.
 * Pure (no React) so the store semantics — single load, sign-out reset, optimistic toggle + rollback —
 * are unit-testable; {@link useSetStore} is the thin `useSyncExternalStore` adapter on top.
 *
 * @template K the set member type (string key or numeric id)
 */
import { useEffect, useSyncExternalStore } from "react";

export type SharedSetStore<K> = {
  /** Subscribe to set changes; returns an unsubscribe. (for {@link useSyncExternalStore}) */
  subscribe: (listener: () => void) => () => void;
  /** Current set snapshot — a fresh reference is published on every change so identity comparison works. */
  getSnapshot: () => ReadonlySet<K>;
  /** Load the set once (no-op if a load is in flight or already succeeded). Idle again on failure → retryable. */
  ensureLoaded: () => Promise<void>;
  /** Clear the set + allow a fresh load (call on sign-out so the next account doesn't inherit the set). */
  reset: () => void;
  /**
   * Optimistically flip {@code key}'s membership, run {@code mutate(had)}, and roll back if it throws.
   * {@code mutate} receives whether the key was present before the flip so it can pick add vs remove.
   */
  optimisticToggle: (key: K, mutate: (had: boolean) => Promise<unknown>) => Promise<void>;
};

export function createSharedSetStore<K>(load: () => Promise<Iterable<K>>): SharedSetStore<K> {
  let members = new Set<K>();
  let status: "idle" | "loading" | "ready" = "idle";
  const listeners = new Set<() => void>();

  function emit() {
    // Replace the reference so useSyncExternalStore sees a new snapshot.
    members = new Set(members);
    for (const l of listeners) l();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function ensureLoaded() {
    if (status !== "idle") return;
    status = "loading";
    try {
      members = new Set(await load());
      status = "ready";
      emit();
    } catch {
      // Leave the set empty and allow a later retry (e.g. after sign-in).
      status = "idle";
    }
  }

  function reset() {
    members = new Set();
    status = "idle";
    for (const l of listeners) l();
  }

  async function optimisticToggle(key: K, mutate: (had: boolean) => Promise<unknown>) {
    const had = members.has(key);
    if (had) members.delete(key);
    else members.add(key);
    emit(); // optimistic
    try {
      await mutate(had);
    } catch {
      if (had) members.add(key);
      else members.delete(key);
      emit(); // rollback
    }
  }

  return { subscribe, getSnapshot: () => members, ensureLoaded, reset, optimisticToggle };
}

/**
 * Thin React adapter shared by the set-backed toggle hooks: subscribes to {@code store}, loads it once
 * the viewer is known (only when authenticated — an anonymous viewer has no saved set), and resets it
 * on sign-out. Returns the live set so callers derive their `has(id)` predicate from it.
 */
export function useSetStore<K>(
  store: SharedSetStore<K>,
  { ready, authenticated }: { ready: boolean; authenticated: boolean },
): ReadonlySet<K> {
  const set = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    if (!ready) return;
    if (authenticated) void store.ensureLoaded();
    else store.reset();
  }, [ready, authenticated, store]);
  return set;
}
