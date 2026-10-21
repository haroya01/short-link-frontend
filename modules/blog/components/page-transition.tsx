import type { ReactNode } from "react";

/**
 * A CSS keyframe class, not a JS `initial` style: SSR markup must stay visible before hydration so
 * LCP isn't pushed to hydration time. The fade leaves no transform behind (fill: none), because a
 * transformed wrapper becomes the containing block of position:fixed modals and sheets inside it.
 * `route-enter` skips the first hard load (html[data-first-load] in globals.css).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="route-enter animate-fade-in">{children}</div>;
}
