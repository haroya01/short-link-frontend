import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export function usePresence(
  open: boolean,
  // Must match the exit class's animation duration.
  exitMs = 200,
): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    if (prefersReducedMotion()) {
      setMounted(false);
      return;
    }
    const id = window.setTimeout(() => setMounted(false), exitMs);
    // Reopening mid-exit lands in the `open` branch above; this clears the pending unmount.
    return () => window.clearTimeout(id);
  }, [open, mounted, exitMs]);

  // Derived, not state: `closing` must be true on the very render where `open` flips false, or the
  // closing overlay keeps swallowing pointer events for a frame.
  return { mounted, closing: mounted && !open };
}
