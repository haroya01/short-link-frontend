"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI 의 Meteors(MIT) 포팅 — 유성 스트릭 장식층.
 * https://magicui.design/docs/components/meteors
 *
 * 머리(2px 점) + 오른쪽으로 잦아드는 1px 꼬리가 215° 사선으로 낙하한다(스트릭 본체와
 * 키프레임은 globals.css `.meteor`). 위치·지연·주기는 마운트 시 랜덤 추첨 — 추첨을
 * useEffect(클라이언트 전용)로 미뤄 SSR 마크업과 어긋나지 않는다. 색은 currentColor 라
 * 호출부가 text-* 로 정한다. 전부 장식이므로 aria-hidden 래퍼 안에서만 쓰고,
 * reduced-motion 은 CSS 쪽 게이트로 정지(기본 opacity 0 = 아무것도 안 보인다).
 */
export function Meteors({ number = 8, className }: { number?: number; className?: string }) {
  const [styles, setStyles] = useState<CSSProperties[]>([]);

  useEffect(() => {
    setStyles(
      Array.from({ length: number }, () => ({
        left: `${Math.round(Math.random() * 100)}%`,
        top: `${Math.round(Math.random() * 26) - 4}%`,
        animationDelay: `${(Math.random() * 7).toFixed(2)}s`,
        animationDuration: `${(Math.random() * 5 + 3).toFixed(2)}s`,
      })),
    );
  }, [number]);

  return (
    <>
      {styles.map((style, i) => (
        <span
          key={i}
          style={style}
          className={cn("meteor pointer-events-none absolute h-0.5 w-0.5 rounded-full", className)}
        />
      ))}
    </>
  );
}
