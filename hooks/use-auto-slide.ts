"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Options = {
  intervalMs?: number;
  enabled: boolean;
  onTick: () => void;
  viewportRef?: RefObject<Element | null>;
};

export function useAutoSlide({ intervalMs = 5000, enabled, onTick, viewportRef }: Options) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const [pausedByUser, setPausedByUser] = useState(false);
  const [pausedByPage, setPausedByPage] = useState(false);
  // WCAG 2.2.2: content that moves on its own must stop for reduced motion. Manual navigation stays.
  const pausedByMotionPref = useReducedMotion();
  const [pausedByViewport, setPausedByViewport] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setPausedByPage(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);


  // IntersectionObserver reports the initial state on observe, so a carousel mounted off-screen starts paused.
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
