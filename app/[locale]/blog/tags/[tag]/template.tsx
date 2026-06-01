import type { ReactNode } from "react";

/**
 * Re-mounts on each topic soft-navigation (tag → tag), so the page body replays a calm fade+rise.
 * Soft nav keeps the header/bottom-nav (in the layout) mounted, so only the topic content transitions
 * — no whole-page slide or chrome blink. CSS in globals.css (.tag-page-enter), reduced-motion-safe.
 */
export default function TagPageTemplate({ children }: { children: ReactNode }) {
  return <div className="tag-page-enter">{children}</div>;
}
