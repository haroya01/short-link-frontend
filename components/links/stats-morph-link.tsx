"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link as TransitionLink } from "next-view-transitions";
import { useLocale } from "next-intl";

/**
 * 대시보드 → 통계 소프트 내비에서 /코드 를 통계 헤더의 /코드 로 모핑시키는 링크.
 * 블로그의 CoverMorphLink 와 같은 클릭-시점 명명 패턴 — 행마다 상시 이름을 주면 무관한
 * 전환(테마 토글 등)마다 스냅샷 레이어가 수십 장 잡히므로, 클릭된 행 스코프
 * (data-vt-link-scope)의 코드 요소([data-vt-link-code])에만 그 순간 `link-code` 를 붙인다.
 * 통계 헤더의 /코드 앵커가 같은 이름(.vt-link-code)을 정적으로 가져 페어가 맞는다.
 */
export function StatsMorphLink({
  shortCode,
  onClick,
  ...props
}: Omit<ComponentProps<typeof TransitionLink>, "href"> & { shortCode: string }) {
  const locale = useLocale();
  return (
    <TransitionLink
      {...props}
      href={`/${locale}/stats/${shortCode}`}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget
          .closest("[data-vt-link-scope]")
          ?.querySelector("[data-vt-link-code]");
        if (el instanceof HTMLElement && "startViewTransition" in document) {
          el.style.viewTransitionName = "link-code";
        }
        onClick?.(e);
      }}
    />
  );
}
