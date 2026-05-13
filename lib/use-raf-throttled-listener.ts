"use client";

import { useEffect, type DependencyList } from "react";

/**
 * Resolves the scroll listener target — either an {@code EventTarget} directly or a getter that
 * the hook calls on mount (used when the target is a ref whose {@code .current} is null on first
 * render and only populated after commit).
 */
type TargetSource = EventTarget | (() => EventTarget | null);

type Options = {
  /** Also re-fire on window resize. Default true — both carousel + tilt care about resize. */
  resize?: boolean;
};

/**
 * Subscribes to a {@code scroll} event (plus optional {@code resize}) on a target and rAF-throttles
 * the callback. Runs the callback once on mount so initial measurements aren't deferred until the
 * first scroll. Mirrors the manual rAF pattern that lived in both {@link useCardCarousel} and
 * {@link useCardTilt} — extracted so a single bug fix (e.g. cleanup race, passive listener flag)
 * applies to every consumer.
 *
 * <p>The {@code deps} array is forwarded to {@link useEffect} verbatim — pass the same deps you'd
 * pass to a hand-rolled effect so the listener re-subscribes when the relevant state changes.
 */
export function useRafThrottledListener(
  target: TargetSource,
  callback: () => void,
  deps: DependencyList,
  options: Options = {},
) {
  /* eslint-disable react-hooks/exhaustive-deps -- deps are caller-controlled (mirrors useEffect) */
  useEffect(() => {
    const el = typeof target === "function" ? target() : target;
    if (!el) return;
    let rafId = 0;
    const tick = () => {
      rafId = 0;
      callback();
    };
    const onEvent = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(tick);
    };
    // Initial measurement — same contract the previous in-line implementations had so consumers
    // (e.g. activeIdx on a carousel mounted mid-scroll) don't see a one-frame "not yet measured"
    // gap.
    callback();
    el.addEventListener("scroll", onEvent, { passive: true });
    const wantsResize = options.resize !== false;
    if (wantsResize) window.addEventListener("resize", onEvent);
    return () => {
      el.removeEventListener("scroll", onEvent);
      if (wantsResize) window.removeEventListener("resize", onEvent);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps */
}
