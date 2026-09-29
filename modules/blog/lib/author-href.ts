const BLOG_HOST = process.env.NEXT_PUBLIC_BLOG_HOST;

/**
 * Author's public blog base. The author profile lives under the BLOG host, velog-style —
 * `blog.kurl.me/@{user}` — NOT on the bare `{user}.kurl.me` subdomain (that's now the link-in-bio
 * 명함). dev/preview has no host split, so it stays on the same-origin `/p/{username}` route.
 */
function authorBase(username: string, locale: string): string {
  return BLOG_HOST ? `https://${BLOG_HOST}/@${username}` : `/${locale}/p/${username}`;
}

/** A post's URL — author base + slug. */
export function postHref(username: string, slug: string, locale: string): string {
  return `${authorBase(username, locale)}/${slug}`;
}

/**
 * Author's home (post list) or a sub-page. prod → `blog.kurl.me/@{user}[/sub]`; dev/preview →
 * `/p/{username}[/sub]`. Pass `subpath` ("series" / "about" / "{slug}") for author sub-pages so links
 * resolve in BOTH deployments — a bare "/series" would break on the path-based dev route.
 */
export function authorHref(username: string, locale: string, subpath = ""): string {
  const base = authorBase(username, locale);
  return subpath ? `${base}/${subpath.replace(/^\//, "")}` : base;
}
