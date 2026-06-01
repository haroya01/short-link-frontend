import type { ReactNode } from "react";

/**
 * Blog content renders directly with NO per-navigation entry transition. A `template.tsx` re-mounts
 * on every route change, so wrapping it in a framer-motion `opacity:0 → 1` (+ y/scale) entrance made
 * every navigation flash the whole page in from invisible — read as flicker/stutter. The chrome
 * (header / sidebar) already lives in the persistent layout.tsx; the content should just swap in
 * place. Keeping the template as a thin pass-through (no animation) is the no-flicker default.
 */
export default function BlogTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
