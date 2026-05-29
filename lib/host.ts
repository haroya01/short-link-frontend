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
