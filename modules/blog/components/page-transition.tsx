import type { ReactNode } from "react";

/**
 * 라우트 진입 페이드. Next `template.tsx` 안에 살아서 내비게이션마다 재마운트되고, 그때 진입이 다시 재생된다.
 *
 * framer-motion 을 쓰지 않는다: framer 의 `initial`(opacity:0) 은 SSR 마크업에 인라인 style="opacity:0" 로
 * 박혀, 하이드레이션 전까지(그리고 JS 가 막히면 영구히) 페이지 전체가 투명해지고 LCP 가 하이드레이션 시점으로
 * 밀린다. 대신 페인트 시점에 도는 Tailwind 키프레임 클래스(`animate-fade-in`)만 쓴다 — JS 없이도 내용이
 * 보이고, reduced-motion 은 globals.css 에서 이 클래스를 즉시 불투명으로 접는다.
 *
 * 진입은 끝 상태에 transform 을 남기지 않는(fill:none) opacity 페이드로 통일한다. 페이지 래퍼에 정적 transform
 * 이 남으면 position:fixed 자손의 containing block 이 되어 모달·시트·FAB 가 뷰포트가 아니라 래퍼에 갇힌다.
 * 그래서 rise/scale(translateY 유지) 진입은 쓰지 않는다. `mode` 는 호출부(template.tsx) 계약을 위해 남긴다.
 */
export function PageTransition({
  children,
}: {
  children: ReactNode;
  mode?: "settle" | "fade";
}) {
  return <div className="animate-fade-in">{children}</div>;
}
