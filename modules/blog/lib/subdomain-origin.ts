/**
 * The canonical origin for an author's public surface, derived from the incoming request host. On the
 * apex deployment the middleware forwards the real author subdomain in `x-original-host`; otherwise the
 * plain `host` is used. Falls back to `https://{username}.kurl.me` when no host header is present (e.g.
 * during static metadata generation). Extracted verbatim from the profile + post pages, which each
 * carried an identical copy for their `generateMetadata` canonical / OG urls.
 *
 * Typed against a minimal header reader (just `get`) so it stays decoupled from `next/headers` and is
 * unit-testable with a plain stub.
 */
export type HeaderReader = { get(name: string): string | null };

export function subdomainOrigin(req: HeaderReader, username: string): string {
  const host = req.get("x-original-host") ?? req.get("host");
  if (!host) return `https://${username}.kurl.me`;
  const cleaned = host.split(":")[0];
  return `https://${cleaned}`;
}
