/**
 * Tiny Web Storage helpers with the boilerplate factored out: SSR guard (`window` undefined → no-op /
 * fallback) and try/catch around every access (private mode / quota / disabled storage throw). Use
 * these instead of hand-rolling `if (typeof window…) try { localStorage… } catch {}` at each site.
 *
 * Two layers:
 *  - JSON: {@link readStorageJson} validates the parsed shape with a guard so a schema drift can't
 *    silently produce corrupt UI state (the original bug shape: recent-links / use-collapsed-sections).
 *  - String: {@link readStorageString} for plain string flags / ids.
 *
 * `{ session: true }` targets sessionStorage (per-tab) instead of localStorage.
 */
type StorageOpts = { session?: boolean };

function store(session?: boolean): Storage | null {
  if (typeof window === "undefined") return null;
  return session ? window.sessionStorage : window.localStorage;
}

export function readStorageJson<T>(
  key: string,
  guard: (value: unknown) => value is T,
  fallback: T,
  opts?: StorageOpts,
): T {
  let raw: string | null;
  try {
    raw = store(opts?.session)?.getItem(key) ?? null;
  } catch {
    return fallback;
  }
  if (raw == null) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  return guard(parsed) ? parsed : fallback;
}

/** Best-effort JSON write. Swallows quota / private-mode errors — persistence is a UX nicety. */
export function writeStorageJson<T>(key: string, value: T, opts?: StorageOpts): void {
  try {
    store(opts?.session)?.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — silent no-op */
  }
}

/** Read a plain string (null when absent / unavailable). */
export function readStorageString(key: string, opts?: StorageOpts): string | null {
  try {
    return store(opts?.session)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Best-effort string write. */
export function writeStorageString(key: string, value: string, opts?: StorageOpts): void {
  try {
    store(opts?.session)?.setItem(key, value);
  } catch {
    /* quota / private mode — silent no-op */
  }
}

/** Best-effort remove. */
export function removeStorageItem(key: string, opts?: StorageOpts): void {
  try {
    store(opts?.session)?.removeItem(key);
  } catch {
    /* private mode — silent no-op */
  }
}
