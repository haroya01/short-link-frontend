"use client";

import { useEffect } from "react";

const LIGHT = "#ffffff";
const DARK = "#040906";

/** Keeps the browser's theme-color on the theme the page actually painted (the per-product cookie,
 *  not the OS setting), so a light page never sits under a dark browser bar. */
export function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", root.classList.contains("dark") ? DARK : LIGHT);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
