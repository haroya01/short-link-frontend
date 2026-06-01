"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Per-navigation entry transition for the blog surface. Lives in a Next `template.tsx`, which
 * re-mounts on every route change — so each navigation re-runs this `initial → animate`. The motion
 * is a quiet fade + a 6px settle + a hair of scale (NOT the old uniform "rise from the bottom"); it
 * reads as the page composing in place rather than sliding up. `prefers-reduced-motion` collapses it
 * to an instant opacity swap. Entry-only by design: App Router unmounts the previous tree before this
 * mounts, so there's no exit phase to animate here (and no layout-shifting transform left behind).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.995 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
