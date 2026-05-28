/**
 * Cross-product host helper.
 *
 * production = `kurl.me` + `blog.kurl.me` (host-based routing).
 * dev / Vercel preview = same origin + path-based fallback (`/blog-preview/*` for blog product).
 *
 * Set NEXT_PUBLIC_KURL_HOST / NEXT_PUBLIC_BLOG_HOST to opt into host-based linking.
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */

const KURL_HOST = process.env.NEXT_PUBLIC_KURL_HOST;
const BLOG_HOST = process.env.NEXT_PUBLIC_BLOG_HOST;

export function linksHref(path: string = "/"): string {
  if (KURL_HOST) return `https://${KURL_HOST}${path}`;
  return path;
}

export function blogHref(path: string = "/"): string {
  if (BLOG_HOST) return `https://${BLOG_HOST}${path}`;
  return `/blog-preview${path === "/" ? "" : path}`;
}
