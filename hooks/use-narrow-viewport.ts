"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 639px)";

// Reads the viewport on first render, so only mount it on the client (after hydration).
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setNarrow(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setNarrow(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}
