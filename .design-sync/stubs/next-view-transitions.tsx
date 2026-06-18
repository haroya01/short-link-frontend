// Preview-only stub for next-view-transitions — Link renders a plain anchor and
// useTransitionRouter returns a no-op router. Mapped in via
// .design-sync/tsconfig.json paths.
import * as React from "react";

const router = {
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => Promise.resolve(),
};
export const useTransitionRouter = () => router;

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
};
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, children, ...props },
  ref,
) {
  const h = typeof href === "string" ? href : href?.pathname ?? "#";
  return (
    <a ref={ref} href={h} {...props}>
      {children}
    </a>
  );
});

export const slideInOut = () => {};
