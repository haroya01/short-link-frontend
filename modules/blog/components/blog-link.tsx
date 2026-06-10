"use client";

import Link from "next/link";
import { useTransitionRouter } from "next-view-transitions";
import { forwardRef, type ComponentProps } from "react";

/**
 * The one navigation primitive for in-blog links. Renders a client-side Next `<Link>` for in-app
 * (relative) hrefs — so a tab/post/author switch is a soft navigation: the route's `loading.tsx`
 * skeleton shows instantly (no freeze-then-pop) and shared layouts stay mounted (no identity flicker).
 *
 * Falls back to a plain `<a>` (hard navigation) for absolute `http(s)://` hrefs — the subdomain
 * deployment ({user}.kurl.me/slug) links cross-host, where the client router can't follow the
 * server-side rewrite. `postHref`/`authorHref` already return absolute there and relative on the
 * path-based deployment, so this picks the right behaviour per surface with no caller changes.
 */
export const BlogLink = forwardRef<HTMLAnchorElement, ComponentProps<"a"> & { href: string }>(
  function BlogLink({ href, children, ...props }, ref) {
    if (/^https?:\/\//.test(href)) {
      return (
        <a ref={ref} href={href} {...props}>
          {children}
        </a>
      );
    }
    return (
      <Link ref={ref} href={href} {...props}>
        {children}
      </Link>
    );
  },
);

/**
 * Chrome navigation (bottom-tab 홈/알림, header logo, write CTA) carrying an ABSOLUTE
 * {@code blogHref(...)} target. The absolute href must stay — the same chrome mounts on the author
 * subdomain, where only a hard cross-origin hop reaches blog.kurl.me. But when the current origin
 * already IS the blog host, a hard navigation means a full reload on the most-used mobile gesture:
 * white flash, tab bar unmount/remount, auth chrome rebuilt. So: render a plain anchor (new-tab /
 * middle-click stay native), and on a plain left click swap to a client-side transition navigation
 * when the target is same-origin. Mirrors blog-header-search's navigate() and the AppsGrid
 * modifier-click fall-through.
 */
export const BlogChromeLink = forwardRef<HTMLAnchorElement, ComponentProps<"a"> & { href: string }>(
  function BlogChromeLink({ href, children, onClick, ...props }, ref) {
    const router = useTransitionRouter();
    return (
      <a
        ref={ref}
        href={href}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          // Modifier / middle clicks keep native anchor behaviour (new tab / window).
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          const url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin) return; // genuine cross-origin → hard nav
          e.preventDefault();
          router.push(url.pathname + url.search + url.hash);
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
);
