"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export type ArrivalAnchor = { element: Element; edge: "top" | "bottom" };

function visibleTop(): number {
  const header = document.querySelector(".vt-app-header");
  return Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
}

function pushesReader(anchor: ArrivalAnchor | null, top: number): boolean {
  if (!anchor) return false;
  const rect = anchor.element.getBoundingClientRect();
  return (anchor.edge === "top" ? rect.top : rect.bottom) < top;
}

export function useHeldArrivals<T extends { id: number }>(
  anchorOf: (item: T) => ArrivalAnchor | null,
  insert: (items: T[], revealed: boolean) => void,
) {
  const [held, setHeld] = useState<T[]>([]);
  const heldIds = useRef(new Set<number>());
  const revealing = useRef(false);
  const latest = useRef({ anchorOf, insert });
  useEffect(() => {
    latest.current = { anchorOf, insert };
  });
  useEffect(() => {
    heldIds.current = new Set(held.map((item) => item.id));
  }, [held]);

  const offer = useCallback((items: T[]) => {
    const top = visibleTop();
    const fresh = items.filter((item) => !heldIds.current.has(item.id));
    const now = fresh.filter((item) => !pushesReader(latest.current.anchorOf(item), top));
    const later = fresh.filter((item) => !now.includes(item));
    if (now.length > 0) latest.current.insert(now, false);
    if (later.length === 0) return;
    later.forEach((item) => heldIds.current.add(item.id));
    setHeld((current) => [...current, ...later.filter((item) => !current.some((c) => c.id === item.id))]);
  }, []);

  useEffect(() => {
    if (held.length === 0) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const top = visibleTop();
      const free = held.filter((item) => !pushesReader(latest.current.anchorOf(item), top));
      if (free.length === 0) return;
      latest.current.insert(free, revealing.current);
      revealing.current = false;
      setHeld((current) => current.filter((item) => !free.some((f) => f.id === item.id)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [held]);

  const show = useCallback(() => {
    const anchor = held[0] ? latest.current.anchorOf(held[0]) : null;
    if (!anchor) {
      latest.current.insert(held, true);
      setHeld([]);
      return;
    }
    revealing.current = true;
    const rect = anchor.element.getBoundingClientRect();
    const by = anchor.edge === "top" ? rect.top - visibleTop() - 8 : rect.bottom - window.innerHeight * 0.4;
    window.scrollBy({ top: by, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [held]);

  const isHeld = useCallback((id: number) => heldIds.current.has(id), []);

  return { held: held.length, offer, show, isHeld };
}
