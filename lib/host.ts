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

/**
 * A user's link-in-bio 명함 (vanity surface). prod → the bare subdomain `{user}.kurl.me`;
 * dev/preview → the same-origin `/{locale}/u/{user}` route. This is the front door for a person on
 * kurl; their blog author profile lives separately at `blog.kurl.me/@{user}` (see authorHref).
 */
export function cardHref(username: string, locale: string): string {
  return KURL_HOST ? `https://${username}.${KURL_HOST}/` : `/${locale}/u/${username}`;
}

export function blogHref(path: string = "/"): string {
  if (BLOG_HOST) return `https://${BLOG_HOST}${path}`;
  return `/blog-preview${path === "/" ? "" : path}`;
}

/**
 * Same-origin RELATIVE blog path for in-app (soft) navigation between blog routes — unlike
 * {@link blogHref} (absolute URL in prod → forces a full reload via next/link), this stays relative
 * so next/link can client-navigate, keeping the layout/header/auth mounted (no per-nav flicker).
 * Only for links FROM a blog page TO another blog page (same origin); cross-product/author links
 * still use the absolute helpers.
 */
export function blogPath(path: string = "/"): string {
  // prod: already on blog.kurl.me, so a leading-slash path is same-origin. dev: /blog-preview/*.
  if (BLOG_HOST) return path;
  return `/blog-preview${path === "/" ? "" : path}`;
}

export type Product = "links" | "blog";

/**
 * Which product the current page belongs to — host-based in production, path-based in dev/preview
 * (same origin). Client-only; returns "links" during SSR (the safe default — the blog surface only
 * uses this after mount). Lets the AppsGrid switcher hide the product you're already on.
 */
export function currentProduct(): Product {
  if (typeof window === "undefined") return "links";
  const { hostname, pathname } = window.location;
  if (BLOG_HOST && hostname === BLOG_HOST) return "blog";
  if (KURL_HOST && hostname === KURL_HOST) return "links";
  // dev / preview: blog lives under /blog-preview/* (or the internal /{locale}/blog/* rewrite).
  if (pathname.includes("/blog-preview") || /^\/[^/]+\/blog(\/|$)/.test(pathname)) return "blog";
  return "links";
}
