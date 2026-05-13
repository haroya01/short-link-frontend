/**
 * Read a JSON-encoded value from localStorage and validate its shape. Returns the fallback when
 * the key is absent, malformed JSON, or fails the type guard — so callers always get a value of
 * the expected type without a try/catch + Array.isArray + nested typeof chain at each site.
 *
 * <p>Why a shared helper: previous bug shape (recent-links, use-collapsed-sections) was "we
 * parsed JSON and checked Array.isArray but didn't validate items, so a schema migration that
 * added a required field silently produced corrupt UI state". The {@code guard} callback runs
 * AFTER parse so the caller can enforce per-item invariants.
 *
 * <p>SSR-safe: returns the fallback when {@code window} is undefined.
 */
export function readStorageJson<T>(
  key: string,
  guard: (value: unknown) => value is T,
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  return guard(parsed) ? parsed : fallback;
}

/**
 * Best-effort write to localStorage. Swallows quota / private-mode errors so the caller doesn't
 * need a try/catch — persistence is a UX optimization, not a correctness boundary.
 */
export function writeStorageJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — silent no-op */
  }
}
