"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * 첫 하드 로드 표식(html[data-first-load] — 루트 레이아웃의 pre-paint 스크립트)을 첫 클라이언트
 * 내비게이션이 커밋되는 순간 뗀다. 페인트 전(layout effect)이라 새 화면의 진입 모션이 첫 프레임부터
 * 돌고, 첫 화면의 내용은 모션 없이 바로 보인다(globals.css 의 첫 로드 규칙).
 */
export function FirstLoadMark() {
  const pathname = usePathname();
  const initial = useRef(pathname);
  useLayoutEffect(() => {
    if (pathname !== initial.current) document.documentElement.removeAttribute("data-first-load");
  }, [pathname]);
  return null;
}
