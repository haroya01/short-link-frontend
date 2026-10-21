"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    function onScroll() {
      const y = window.scrollY;
      if (y > lastY.current + 8 && y > 80) setHidden(true);
      else if (y < lastY.current - 8) setHidden(false);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}
