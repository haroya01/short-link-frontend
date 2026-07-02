"use client";

import { useEffect, useState } from "react";

/**
 * The on-screen keyboard height: how much shorter the visual viewport is than the layout viewport.
 * Used to lift a bottom sheet (highlight note, publish settings) above the keyboard on mobile so its
 * footer and lower fields stay reachable while typing. No-op on desktop / browsers without
 * visualViewport (returns 0).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}
