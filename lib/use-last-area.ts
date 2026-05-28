"use client";

import { useEffect, useState } from "react";

const KEY = "kurl:last-area";

export type Area = "content" | "links";

const DEFAULT: Area = "links";

export function useLastArea(): Area {
  const [area, setArea] = useState<Area>(DEFAULT);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "content" || v === "links") setArea(v);
    } catch {
      // localStorage 비활성 — default 유지
    }
  }, []);

  return area;
}

export function markLastArea(area: Area): void {
  try {
    window.localStorage.setItem(KEY, area);
  } catch {
    // ignore
  }
}
