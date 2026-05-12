"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/**
 * Pointer + scroll driven CSS-variable controller for the holographic card surface. Encapsulates
 * the simeydotme/pokemon-cards-css technique we use on the {@link ContactCardEntry}:
 *
 * <ol>
 *   <li><b>Pointer move</b> sets seven derived CSS custom properties on the card element —
 *       {@code --pointer-x/y}, {@code --pointer-from-center}, {@code --pointer-from-left/top},
 *       {@code --background-x/y}, {@code --card-opacity}, {@code --rotate-x/y}. Downstream
 *       gradient layers read these to compute their position, intensity, parallax, and the
 *       wrapper's 3-D tilt.</li>
 *   <li><b>Scroll fallback</b> kicks in when the visitor isn't actively pointing — vertical scroll
 *       position drives a slow "look angle" simulation so the holographic effect breathes while
 *       the card moves through the viewport. Tied to scroll (not a continuous animation) so
 *       reduced-motion users get a calm card.</li>
 * </ol>
 *
 * <p>Returns a ref to attach to the card element, plus the {@code onPointerMove} /
 * {@code onPointerLeave} handlers to wire into JSX. The scroll listener is installed and torn
 * down automatically.
 *
 * <p>Extracted from ContactCardEntry so the component focuses on layout. The hook stays in
 * {@code lib/} (not under {@code _components/}) because it has no React component dependencies
 * and is conceivably reusable on any other holographic-styled element in the future.
 */
export function useCardTilt(): {
  cardRef: RefObject<HTMLDivElement>;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;
} {
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerOverRef = useRef(false);

  const applyVars = useCallback((x: number, y: number, opacity: number) => {
    const el = cardRef.current;
    if (!el) return;
    const fromCenter = Math.min(
      1,
      Math.sqrt((x - 50) * (x - 50) + (y - 50) * (y - 50)) / 50,
    );
    // background-x/y mapped to a narrow band (37-63% / 33-67%) so the rainbow scroll is subtle —
    // matches simey's `adjust(0, 100, 37, 63)`.
    const bgX = 37 + (x / 100) * 26;
    const bgY = 33 + (y / 100) * 34;
    // Pointer-following tilt: "look toward pointer" convention, ±8°.
    const rotateY = -((x - 50) / 50) * 8;
    const rotateX = ((y - 50) / 50) * 8;
    el.style.setProperty("--pointer-x", `${x}%`);
    el.style.setProperty("--pointer-y", `${y}%`);
    el.style.setProperty("--pointer-from-center", `${fromCenter}`);
    el.style.setProperty("--pointer-from-left", `${x / 100}`);
    el.style.setProperty("--pointer-from-top", `${y / 100}`);
    el.style.setProperty("--background-x", `${bgX}%`);
    el.style.setProperty("--background-y", `${bgY}%`);
    el.style.setProperty("--card-opacity", `${opacity}`);
    el.style.setProperty("--rotate-x", `${rotateY}deg`);
    el.style.setProperty("--rotate-y", `${rotateX}deg`);
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      pointerOverRef.current = true;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      applyVars(x, y, 0.9);
    },
    [applyVars],
  );

  // Scroll-driven pseudo-pointer position — simulates the visitor's "look angle" changing as the
  // card scrolls through the viewport. Lower opacity (0.55 vs 0.9) so the surface is alive but
  // calmer when the visitor isn't actively engaging.
  const applyScrollVars = useCallback(() => {
    const el = cardRef.current;
    if (!el || pointerOverRef.current) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const cardMid = rect.top + rect.height / 2;
    const yPct = Math.max(0, Math.min(100, (cardMid / vh) * 100));
    applyVars(50, yPct, 0.55);
  }, [applyVars]);

  useEffect(() => {
    applyScrollVars();
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        applyScrollVars();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [applyScrollVars]);

  const onPointerLeave = useCallback(() => {
    pointerOverRef.current = false;
    applyScrollVars();
  }, [applyScrollVars]);

  return { cardRef, onPointerMove, onPointerLeave };
}
