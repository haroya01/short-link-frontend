"use client";

import { useEffect, useState } from "react";

/**
 * 상단 크롬의 "축소(condensed)" 상태 — 스크롤이 시작되면 풀폭 바가 떠 있는 유리 캡슐로
 * 줄어드는 패턴(AGENTS §12)의 상태원. on/off 임계값을 벌려둔 히스테리시스로 경계에서의
 * 지터를 막고, rAF 스로틀 + passive 리스너로 스크롤 비용을 없앤다.
 */
export function useCondensedChrome(onAt = 32, offAt = 8): boolean {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setCondensed((c) => (c ? y > offAt : y > onAt));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [onAt, offAt]);

  return condensed;
}
