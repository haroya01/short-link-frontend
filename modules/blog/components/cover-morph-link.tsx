"use client";

import type { ComponentProps, MouseEvent } from "react";
import { Link as TransitionLink } from "next-view-transitions";

/**
 * 카드 → 글 소프트 내비에서 커버 사진을 글 히어로로 모핑시키는 전면 링크. 클릭 순간에만 가장
 * 가까운 카드 스코프(data-vt-cover-scope)의 커버 이미지([data-vt-cover])에 고정 이름
 * `post-cover` 를 붙인다.
 *
 * - 클릭 시점 명명인 이유: 그리드의 모든 사진에 상시 이름을 주면 무관한 전환(탭 전환·테마
 *   토글)마다 스냅샷 레이어가 수십 장 잡힌다. 클릭된 한 장만 이름을 가진 채 전환이 시작되므로
 *   고정 이름이어도 충돌이 없고, 소프트 내비로 옛 페이지가 통째로 언마운트돼 뒷정리도 불필요.
 * - 글 상세의 히어로 <img> 가 같은 이름을 정적으로 가진다 — 페어가 맞으면 브라우저가 박스를
 *   모핑하고, 비율 차 stretch 는 globals 의 object-fit 레시피가 막는다(예전 폐기 사유 해소).
 */
export function CoverMorphLink({
  onClick,
  ...props
}: ComponentProps<typeof TransitionLink>) {
  return (
    <TransitionLink
      {...props}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        const img = e.currentTarget
          .closest("[data-vt-cover-scope]")
          ?.querySelector("[data-vt-cover]");
        if (img instanceof HTMLElement && "startViewTransition" in document) {
          img.style.viewTransitionName = "post-cover";
        }
        onClick?.(e);
      }}
    />
  );
}
