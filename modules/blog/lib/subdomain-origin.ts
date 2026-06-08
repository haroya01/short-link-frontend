/**
 * Absolute base URL for an author's public blog surface — velog-style `https://blog.kurl.me/@{user}`.
 * Callers append "/" (home), "/feed" (RSS) or "/{slug}" (post) to build canonical / OG / alternate
 * urls. Prefers the configured blog host (NEXT_PUBLIC_BLOG_HOST); falls back to the request host
 * (x-original-host forwarded by the CF proxy, else host) for dev/preview, then `blog.kurl.me`.
 *
 * Typed against a minimal header reader (just `get`) so it stays decoupled from `next/headers` and is
 * unit-testable with a plain stub.
 */
export type HeaderReader = { get(name: string): string | null };

export function authorBaseUrl(req: HeaderReader, username: string): string {
  const reqHost = req.get("x-original-host") ?? req.get("host");
  const blogHost =
    process.env.NEXT_PUBLIC_BLOG_HOST || (reqHost ? reqHost.split(":")[0] : "blog.kurl.me");
  return `https://${blogHost}/@${username}`;
}
