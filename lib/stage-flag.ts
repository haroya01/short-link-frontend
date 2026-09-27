"use client";

import { useEffect, useState } from "react";
import { track } from "@/components/common/posthog-provider";

export type StageVariant = "on" | "off";

const COOKIE_NAME = "kurl_stage";
// 90 days: long enough that an A/B assignment stays sticky across return visits,
// short enough that a killed experiment doesn't haunt returning visitors forever.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

type ResolveInput = {
  /** window.location.search ("?stage=on") */
  search: string;
  /** document.cookie */
  cookie: string;
  /** NEXT_PUBLIC_STAGE_DEFAULT */
  envDefault: string | undefined;
  /** NEXT_PUBLIC_STAGE_SPLIT — "0".."100", percentage of visitors auto-assigned "on" */
  envSplit: string | undefined;
  /** injected for tests; production uses Math.random */
  random?: () => number;
};

type Resolution = {
  variant: StageVariant;
  /** cookie must be (re)written — true for URL overrides and fresh split assignments */
  persist: boolean;
  /** a fresh random assignment happened (exposure worth tracking once) */
  assigned: boolean;
};

function readCookie(cookie: string): StageVariant | null {
  for (const part of cookie.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE_NAME && (v === "on" || v === "off")) return v;
  }
  return null;
}

/**
 * Stage(무대) 연출 레이어의 노출 결정. 우선순위:
 * URL ?stage=on|off (프리뷰/롤백 오버라이드, 쿠키로 고정)
 *   → kurl_stage 쿠키 (이전 방문의 오버라이드/배정)
 *   → NEXT_PUBLIC_STAGE_SPLIT 퍼센트 무작위 배정 (A/B)
 *   → NEXT_PUBLIC_STAGE_DEFAULT
 *   → "off"
 *
 * 의도적으로 클라이언트 전용이다: middleware 에서 Set-Cookie 를 붙이면 랜딩의 엣지 캐시가
 * 깨진다(NEXT_LOCALE 을 blog 응답에서 뺀 것과 같은 이유). 연출은 aria-hidden 장식 레이어라
 * SSR 분기가 필요 없고, hydration 뒤 늦게 붙어도 스크롤 연동 진입이라 티가 나지 않는다.
 */
export function resolveStageVariant(input: ResolveInput): Resolution {
  const params = new URLSearchParams(input.search);
  const fromUrl = params.get("stage");
  if (fromUrl === "on" || fromUrl === "off") {
    return { variant: fromUrl, persist: true, assigned: false };
  }

  const fromCookie = readCookie(input.cookie);
  if (fromCookie) return { variant: fromCookie, persist: false, assigned: false };

  const split = Number(input.envSplit);
  if (Number.isFinite(split) && split > 0) {
    const roll = (input.random ?? Math.random)() * 100;
    const variant: StageVariant = roll < split ? "on" : "off";
    return { variant, persist: true, assigned: true };
  }

  // 2026-07-23 졸업: 무대가 기본값. envDefault="off" 는 비상 강등 스위치로 남긴다.
  if (input.envDefault === "off") return { variant: "off", persist: false, assigned: false };
  return { variant: "on", persist: false, assigned: false };
}

/**
 * 마운트 후 한 번 결정하고 이후 고정. 졸업 후 SSR/첫 페인트 = "on"(무대가 기본) —
 * off 쿠키/파라미터 보유자(레거시 opt-out)만 하이드레이션 후 구버전으로 스왑된다(소수).
 */
export function useStageVariant(): StageVariant {
  const [variant, setVariant] = useState<StageVariant>("on");

  useEffect(() => {
    const res = resolveStageVariant({
      search: window.location.search,
      cookie: document.cookie,
      envDefault: process.env.NEXT_PUBLIC_STAGE_DEFAULT,
      envSplit: process.env.NEXT_PUBLIC_STAGE_SPLIT,
    });
    if (res.persist) {
      document.cookie = `${COOKIE_NAME}=${res.variant}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    }
    if (res.assigned) {
      track("stage_variant_assigned", { variant: res.variant });
    }
    setVariant(res.variant);
  }, []);

  return variant;
}
