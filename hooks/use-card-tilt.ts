"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useRafThrottledListener } from "./use-raf-throttled-listener";

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
  // Gates the scroll-driven measurement on viewport visibility. Offscreen the rect read + var
  // writes are wasted (the look angle clamps to a constant), so we skip them. A ref keeps this off
  // the render path; defaults to true so behavior is unchanged where IntersectionObserver is
  // unavailable (SSR / old engines).
  const visibleRef = useRef(true);

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
  // card scrolls through the viewport. Rest opacity sits well below the pointer-engaged 0.9: at
  // 0.55 the color-dodge shine washed the dark substrate bright enough that static screenshots
  // read it as a low-contrast colored background (and the foil stripe as a rendering artifact
  // across the website row — the daily UX judge flagged both for weeks). 0.3 keeps the surface
  // breathing on scroll while the text sits on a properly dark base until the visitor engages.
  const applyScrollVars = useCallback(() => {
    const el = cardRef.current;
    if (!el || pointerOverRef.current || !visibleRef.current) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const cardMid = rect.top + rect.height / 2;
    const yPct = Math.max(0, Math.min(100, (cardMid / vh) * 100));
    applyVars(50, yPct, 0.3);
  }, [applyVars]);

  // Only measure while the card is actually on screen. The passive scroll listener stays
  // subscribed, but offscreen its callback short-circuits (via visibleRef) instead of reading
  // layout + writing CSS vars every frame — pure waste on long profiles. Re-sync on entry so the
  // card doesn't wait for the next scroll frame to pick up its look angle.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      visibleRef.current = visible;
      if (visible) applyScrollVars();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [applyScrollVars]);

  // Target getter (not `window` directly) so SSR doesn't trip on the global lookup at render
  // time — useEffect runs client-side only, where the getter resolves safely.
  useRafThrottledListener(() => window, applyScrollVars, [applyScrollVars]);

  const onPointerLeave = useCallback(() => {
    pointerOverRef.current = false;
    applyScrollVars();
  }, [applyScrollVars]);

  return { cardRef, onPointerMove, onPointerLeave };
}
