"use client";

import { useEffect } from "react";
import { applyNotFoundLocale } from "@/lib/not-found-locale";

/**
 * 404 문서의 언어 보정. 동적 페이지의 notFound() 는 __next_error__ 셸에서 클라이언트 렌더라
 * head 의 인라인 스크립트가 실행되지 않는다(NotFoundThemeSync 와 같은 사정) — hydration 후 같은
 * 판정을 한 번 더 적용한다.
 */
export function NotFoundLocaleSync({
  locales,
  fallback,
  titles,
}: {
  locales: readonly string[];
  fallback: string;
  titles: Record<string, string>;
}) {
  useEffect(() => {
    applyNotFoundLocale(locales, fallback, titles);
  }, [locales, fallback, titles]);
  return null;
}
