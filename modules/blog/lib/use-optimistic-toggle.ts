"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";

/** The viewer-relative state a toggle owns: whether it's on, plus an optional public counter. */
export type ToggleState = { on: boolean; count?: number };

// Process-wide store keyed by syncKey, so multiple buttons for the SAME thing (e.g. the like button
// rendered both at the top and bottom of a post) stay in lockstep — a click on one updates the other
// with no reload. Without a syncKey each hook instance gets a unique key (useId) → effectively local.
// loadToken/loading dedupe the initial fetch across instances sharing a syncKey: the top+bottom copies
// of the same button mount together and would each fire the same GET. The first records the in-flight
// promise; the rest await it. A changed token (new post, or auth flip) starts a fresh load.
type Entry = {
  state: ToggleState;
  listeners: Set<() => void>;
  loadToken?: string;
  loading?: Promise<void>;
};
const stores = new Map<string, Entry>();

function entryFor(key: string, init: ToggleState): Entry {
  let e = stores.get(key);
  if (!e) {
    e = { state: init, listeners: new Set() };
    stores.set(key, e);
  }
  return e;
}

function emit(key: string, next: ToggleState) {
  const e = stores.get(key);
  if (!e) return;
  e.state = next;
  e.listeners.forEach((l) => l());
}

// Run {@code load} once per (key, token): concurrent instances of the same toggle share the pending
// request instead of each firing their own. Returns the shared promise so every caller can flip its own
// `loaded` flag when it settles.
function loadInto(key: string, token: string, load: () => Promise<ToggleState>): Promise<void> {
  const e = stores.get(key);
  if (!e) return Promise.resolve();
  if (e.loadToken === token && e.loading) return e.loading;
  e.loadToken = token;
  const p = load()
    .then((s) =>
      emit(key, {
        on: s.on,
        count: s.count !== undefined ? s.count : stores.get(key)?.state.count,
      }),
    )
    .catch(() => {});
  e.loading = p;
  return p;
}

/**
 * The optimistic-toggle pattern shared by the like + bookmark buttons on the public post page: a
 * per-viewer on/off state (and, for likes, a public count) that loads once the viewer is known, flips
 * optimistically on click, reconciles against the server's authoritative response, and rolls back on
 * error. An anonymous click starts the login flow instead of mutating.
 *
 * Pass {@code syncKey} (e.g. {@code `like:${postId}`}) to keep multiple instances of the same toggle
 * in sync — used so the same post's like/bookmark can sit at both the top and bottom of the page.
 *
 * The follow button deliberately stays on its own implementation — it loads for anonymous viewers too
 * (to show the public follower count), gates a count fade-in on a `loaded` flag, hides itself on your
 * own profile, and has a compact variant — so folding it in here would trade real duplication removal
 * for option sprawl. Series subscription uses {@link useSeriesSubscriptions} (a shared set store).
 *
 * @param depKey the id the load is keyed to (e.g. postId) — re-loads when it changes
 * @param load   fetch the viewer's current state; called once ready (and, by default, authenticated)
 * @param mutate apply the next state server-side; its response is authoritative (reconciled in)
 * @param syncKey optional process-wide key shared by all instances that must stay in lockstep
 */
export function useOptimisticToggle({
  depKey,
  initialOn = false,
  initialCount,
  loadWhen = "authenticated",
  load,
  mutate,
  syncKey,
}: {
  depKey: string | number;
  initialOn?: boolean;
  initialCount?: number;
  loadWhen?: "authenticated" | "ready";
  load: () => Promise<ToggleState>;
  mutate: (next: boolean) => Promise<ToggleState>;
  syncKey?: string;
}) {
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const fallbackId = useId();
  const key = syncKey ?? fallbackId;
  const initRef = useRef<ToggleState>({ on: initialOn, count: initialCount });
  entryFor(key, initRef.current); // ensure the entry exists before the first snapshot

  const subscribe = useCallback(
    (cb: () => void) => {
      const e = entryFor(key, initRef.current);
      e.listeners.add(cb);
      return () => {
        e.listeners.delete(cb);
        if (e.listeners.size === 0) stores.delete(key);
      };
    },
    [key],
  );
  const state = useSyncExternalStore(
    subscribe,
    () => entryFor(key, initRef.current).state,
    () => initRef.current,
  );
  const on = state.on;
  const count = state.count;

  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tracksCount = initialCount !== undefined;

  useEffect(() => {
    if (!ready) return;
    if (loadWhen === "authenticated" && !authenticated) return;
    // Token mirrors the effect's own triggers so an auth flip / new depKey still re-loads, while two
    // instances with the same triggers collapse onto one request.
    loadInto(key, `${depKey}:${authenticated}`, load).finally(() => setLoaded(true));
    // load is recreated each render; depKey/key are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, depKey, key]);

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    setBusy(true);
    const cur = entryFor(key, initRef.current).state;
    const next = !cur.on;
    emit(key, { on: next, count: tracksCount ? (cur.count ?? 0) + (next ? 1 : -1) : cur.count });
    try {
      const s = await mutate(next);
      emit(key, {
        on: s.on,
        count: s.count !== undefined ? s.count : entryFor(key, initRef.current).state.count,
      });
    } catch {
      const c = entryFor(key, initRef.current).state;
      emit(key, { on: !next, count: tracksCount ? (c.count ?? 0) + (next ? -1 : 1) : c.count });
    } finally {
      setBusy(false);
    }
  }

  return { on, count, busy, loaded, toggle };
}
