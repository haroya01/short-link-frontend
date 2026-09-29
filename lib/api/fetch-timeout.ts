/**
 * A `fetch` that gives up after `timeoutMs` instead of hanging until the platform kills the
 * function. Without this, a single slow backend call during SSR keeps a Vercel serverless function
 * open to its full duration limit (~15–25s), which the uptime monitor sees as a timeout — a brief
 * backend hiccup gets amplified into a "site down" page. Aborting at a few seconds turns that same
 * hiccup into a fast failure the caller can degrade gracefully (feed renders empty, ISR serves the
 * last good page) or surface as an error boundary — either way the function returns in time.
 *
 * A caller-supplied `signal` (e.g. abort-on-unmount) is honored alongside the timeout: whichever
 * fires first wins.
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 8000;

export function isTimeoutError(err: unknown): boolean {
  return (
    err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")
  );
}

export function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  // timeoutMs <= 0 opts out (long-running exports that legitimately exceed the ceiling).
  if (timeoutMs <= 0) return fetch(input, init);

  const caller = init.signal;
  // Common path: no caller signal — a bare timeout signal is enough.
  if (!caller) {
    return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  }

  // Caller passed its own signal (e.g. abort-on-unmount): combine the two. Done with an
  // AbortController rather than AbortSignal.any() because the latter isn't available in every
  // runtime we render in (jsdom, older edge) — a controller works anywhere AbortController does.
  const controller = new AbortController();
  const abort = (reason: unknown) => controller.abort(reason);
  if (caller.aborted) {
    abort(caller.reason);
  } else {
    caller.addEventListener("abort", () => abort(caller.reason), { once: true });
  }
  const timer = setTimeout(() => abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
