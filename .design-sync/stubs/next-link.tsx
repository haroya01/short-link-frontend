// Preview-only stub for next/link — renders a plain anchor. next/link needs the
// app-router context (absent in the preview/design runtime). Mapped in via
// .design-sync/tsconfig.json paths.
import * as React from "react";

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  // next/link extras — accepted and dropped so they don't reach the DOM.
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  locale?: string | false;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, shallow, passHref, locale, children, ...props },
  ref,
) {
  const h = typeof href === "string" ? href : href?.pathname ?? "#";
  return (
    <a ref={ref} href={h} {...props}>
      {children}
    </a>
  );
});

export default Link;
