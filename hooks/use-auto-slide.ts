"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Options = {
  /** Tick interval in ms. */
  intervalMs?: number;
  /** Whether autoplay should be on at all (e.g. {@code images.length > 1}). */
  enabled: boolean;
  /** Called once per tick. Use a closure capturing latest state — the hook keeps a ref to it. */
  onTick: () => void;
  /**
   * Optional element to observe — autoplay pauses while it sits outside the viewport. An off-screen
   * carousel that keeps scrolling and re-rendering just burns CPU where no one can see it. Omit to
   * keep autoplay running regardless of scroll position.
   */
  viewportRef?: RefObject<Element | null>;
};

/**
 * Shared autoplay timer for carousels (gallery / product card images). Pauses automatically when
 * the browser tab is hidden ({@link document.visibilityState}) — running an interval that scrolls
 * elements while no one is looking just wastes CPU and creates jank when the tab refocuses with
 * stale frames pending. Caller controls the "user paused" state (hover / touch / lightbox open)
 * via the returned {@code pause} / {@code resume} handles.
 *
 * <p>{@code onTick} is captured in a ref so the caller doesn't need {@code useCallback} for every
 * pass — typical caller shape is {@code () => setIdx((i) => (i + 1) % count)} which closes over
 * {@code count} from props, and forcing a {@code useCallback} for that would just create churn.
 */
export function useAutoSlide({ intervalMs = 5000, enabled, onTick, viewportRef }: Options) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const [pausedByUser, setPausedByUser] = useState(false);
  const [pausedByPage, setPausedByPage] = useState(false);
  const [pausedByMotionPref, setPausedByMotionPref] = useState(false);
  const [pausedByViewport, setPausedByViewport] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setPausedByPage(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // prefers-reduced-motion kills autoplay outright (WCAG 2.2.2 — moving content that starts on its
  // own must respect the user's motion setting). Manual navigation (dots / arrows / swipe) stays.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPausedByMotionPref(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Pause while the observed element is scrolled out of view (only when the caller hands us one).
  // IntersectionObserver reports the initial state on observe, so a carousel that mounts off-screen
  // starts paused.
  useEffect(() => {
    const el = viewportRef?.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setPausedByViewport(!e.isIntersecting);
      },
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [viewportRef]);

  const paused = pausedByUser || pausedByPage || pausedByMotionPref || pausedByViewport;

  useEffect(() => {
    if (!enabled || paused) return;
    const id = window.setInterval(() => onTickRef.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, paused, intervalMs]);

  return {
    pause: () => setPausedByUser(true),
    resume: () => setPausedByUser(false),
    paused,
  };
}
