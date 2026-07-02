"use client";

import { useEffect } from "react";

/**
 * Fades lazy-loaded content images in on load (the `img.img-fade` rules in globals.css). A capturing
 * document-level listener marks each tagged image as it finishes loading — one listener instead of an
 * onLoad per call site, which also lets server components (FeedCard, post blocks) opt in with just a
 * class. Ordering matters: the listener attaches BEFORE the sweep so an image finishing between the
 * two is never missed; the sweep marks images that completed before hydration (cache hits included);
 * and only then does the root flag turn the CSS on — so nothing is ever hidden pre-hydration (LCP
 * unaffected) and already-loaded images never flash. `error` is marked too, so a broken image shows
 * its fallback state instead of staying transparent forever.
 */
export function ImageFade() {
  useEffect(() => {
    const mark = (e: Event) => {
      const el = e.target;
      if (el instanceof HTMLImageElement && el.classList.contains("img-fade")) {
        el.setAttribute("data-loaded", "");
      }
    };
    document.addEventListener("load", mark, true);
    document.addEventListener("error", mark, true);
    document.querySelectorAll<HTMLImageElement>("img.img-fade").forEach((img) => {
      if (img.complete) img.setAttribute("data-loaded", "");
    });
    document.documentElement.setAttribute("data-img-fade", "");
    return () => {
      document.removeEventListener("load", mark, true);
      document.removeEventListener("error", mark, true);
      document.documentElement.removeAttribute("data-img-fade");
    };
  }, []);
  return null;
}
