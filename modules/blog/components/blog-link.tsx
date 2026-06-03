"use client";

import Link from "next/link";
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
