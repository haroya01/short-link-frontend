"use client";

import { useEffect, useState } from "react";

export type StageVariant = "on" | "off";

/**
 * Stage(무대) 연출 레이어의 노출 결정. URL ?stage=on|off 가 그 방문 한 번만 우선하고(프리뷰·롤백
 * 확인용), 없으면 NEXT_PUBLIC_STAGE_DEFAULT="off" 비상 강등이 아닌 한 "on". 예전 A/B 배정 쿠키
 * (kurl_stage)는 더 읽지 않는다 — 그 쿠키를 가진 방문자에게 레거시 랜딩이 계속 나갔다.
 *
 * 의도적으로 클라이언트 전용이다: middleware 에서 분기하면 랜딩의 엣지 캐시가 깨진다. 연출은
 * aria-hidden 장식 레이어라 SSR 분기가 필요 없다.
 */
export function resolveStageVariant(input: { search: string; envDefault: string | undefined }): StageVariant {
  const fromUrl = new URLSearchParams(input.search).get("stage");
  if (fromUrl === "on" || fromUrl === "off") return fromUrl;
  return input.envDefault === "off" ? "off" : "on";
}

/** 마운트 후 한 번 결정. SSR/첫 페인트 = "on" — ?stage=off 방문만 하이드레이션 후 구버전으로 스왑된다. */
export function useStageVariant(): StageVariant {
  const [variant, setVariant] = useState<StageVariant>("on");

  useEffect(() => {
    setVariant(
      resolveStageVariant({
        search: window.location.search,
        envDefault: process.env.NEXT_PUBLIC_STAGE_DEFAULT,
      }),
    );
  }, []);

  return variant;
}
