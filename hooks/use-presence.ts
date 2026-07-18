import { useEffect, useState } from "react";

/**
 * Exit-phase presence for a conditionally rendered overlay (dropdown / dialog / sheet / toast).
 * Overlays animate IN via a mount animation, but a bare `{open && ...}` unmounts them the instant
 * `open` flips — the exit pops. Given `open`, this holds `mounted` true for `exitMs` after `open`
 * goes false and flags that window as `closing`, so the component can swap in its exit animation
 * class and only unmount once it has played. Reduced-motion users unmount immediately (the exit
 * classes are also collapsed in globals.css, so there is never an invisible wait).
 */
export function usePresence(
  open: boolean,
  // Exit duration in ms — must match the exit class's animation duration (exits ride the move
  // tier, slightly quicker than their entrances).
  exitMs = 200,
): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false);
      return;
    }
    const id = window.setTimeout(() => setMounted(false), exitMs);
    // Reopening mid-exit lands in the `open` branch above; this clears the pending unmount.
    return () => window.clearTimeout(id);
  }, [open, mounted, exitMs]);

  // Derived, not state: `closing` must be true on the very render where `open` flips false. As a
  // second state set in an effect it lagged one paint behind, leaving a frame where the overlay was
  // exit-bound but still wore its entrance class — and, worse, still swallowed pointer events
  // (overlays gate `pointer-events-none` on `closing`). A click in that frame died on an invisible
  // backdrop.
  return { mounted, closing: mounted && !open };
}
