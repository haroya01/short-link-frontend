"use client";

import { useEffect } from "react";

/**
 * 404 문서의 테마 보정. 루트 not-found 는 두 경로로 렌더된다 — 미매칭 URL 은 서버 스트림
 * (head 의 인라인 스크립트가 no-FOUC 로 처리), 동적 페이지의 notFound() 는 __next_error__
 * 셸에서 클라이언트 렌더라 React 가 만든 <script> 가 실행되지 않는다. 후자를 위해
 * hydration 후 같은 쿠키 판정을 한 번 더 적용한다(원본=lib/theme-cookie.ts 판정).
 */
export function NotFoundThemeSync() {
  useEffect(() => {
    try {
      const platform = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";
      const host = location.hostname;
      const onPlatform = host === platform || host.endsWith("." + platform);
      const seg = location.pathname.split("/")[2];
      const name =
        (onPlatform && host !== platform) || seg === "blog" || seg === "p"
          ? "theme"
          : "kurl_theme";
      const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=(dark|light)"));
      const theme = m ? m[1] : onPlatform ? null : localStorage.getItem(name);
      if (theme === "dark") document.documentElement.classList.add("dark");
    } catch {
      /* 장식 보정 — 실패해도 라이트 폴백 */
    }
  }, []);
  return null;
}
