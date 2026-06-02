"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

/** The viewer-relative state a toggle owns: whether it's on, plus an optional public counter. */
export type ToggleState = { on: boolean; count?: number };

/**
 * The optimistic-toggle pattern shared by the like + bookmark buttons on the public post page: a
 * per-viewer on/off state (and, for likes, a public count) that loads once the viewer is known, flips
 * optimistically on click, reconciles against the server's authoritative response, and rolls back on
 * error. An anonymous click starts the login flow instead of mutating.
 *
 * The follow button deliberately stays on its own implementation — it loads for anonymous viewers too
 * (to show the public follower count), gates a count fade-in on a `loaded` flag, hides itself on your
 * own profile, and has a compact variant — so folding it in here would trade real duplication removal
 * for option sprawl. Series subscription uses {@link useSeriesSubscriptions} (a shared set store).
 *
 * @param depKey the id the load is keyed to (e.g. postId) — re-loads when it changes
 * @param load   fetch the viewer's current state; called once ready (and, by default, authenticated)
 * @param mutate apply the next state server-side; its response is authoritative (reconciled in)
 */
export function useOptimisticToggle({
  depKey,
  initialOn = false,
  initialCount,
  loadWhen = "authenticated",
  load,
  mutate,
}: {
  depKey: string | number;
  initialOn?: boolean;
  initialCount?: number;
  loadWhen?: "authenticated" | "ready";
  load: () => Promise<ToggleState>;
  mutate: (next: boolean) => Promise<ToggleState>;
}) {
  const { authenticated, ready, signInWithGoogle } = useAuth();
  const [on, setOn] = useState(initialOn);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tracksCount = initialCount !== undefined;

  useEffect(() => {
    if (!ready) return;
    if (loadWhen === "authenticated" && !authenticated) return;
    load()
      .then((s) => {
        setOn(s.on);
        if (s.count !== undefined) setCount(s.count);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // load is recreated each render; depKey is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, depKey]);

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    if (tracksCount) setCount((c) => (c ?? 0) + (next ? 1 : -1));
    try {
      const s = await mutate(next);
      setOn(s.on);
      if (s.count !== undefined) setCount(s.count);
    } catch {
      setOn(!next);
      if (tracksCount) setCount((c) => (c ?? 0) + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return { on, count, busy, loaded, toggle };
}
