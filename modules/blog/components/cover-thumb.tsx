"use client";

import Image from "next/image";
import { canOptimizeCover } from "@/modules/blog/lib/optimized-image";

/**
 * 목록 표면의 커버 이미지 한 벌 — 허용 호스트(자사 CDN·Qiita·Unsplash)는 next/image 로
 * 슬롯 크기에 맞는 변형을 받아오고(96px 자리에 수 MB 원본이 내려오던 낭비의 종식), 그 외
 * 호스트는 기존과 동일한 원본 <img> 폴백. `img-fade` 는 img 요소 셀렉터라 양쪽 다 동작한다.
 *
 * fill 이 아니라 고정 치수 모드 — 호출측 슬롯이 h-20 w-28 처럼 클래스로 크기를 소유하므로
 * className(h-full w-full object-cover …)이 표시 크기를, width/height 는 종횡비와 srcset
 * 산정만 맡는다. `sizes` 로 실제 요청 폭을 슬롯에 맞춘다.
 */
export function CoverThumb({
  src,
  sizes,
  className,
  eager = false,
  vtCover = false,
}: {
  src: string;
  /** 슬롯의 표시 폭 힌트 (예: "(min-width: 640px) 128px, 80px", 커버형은 "100vw" 류). */
  sizes: string;
  className?: string;
  /** above-fold LCP 후보 — lazy 대신 즉시 로드 + 우선순위. img-fade 도 끈다(기존 규칙). */
  eager?: boolean;
  /** View Transition 커버 모핑 대상 표식(data-vt-cover). */
  vtCover?: boolean;
}) {
  const cls = eager || !className ? className : `img-fade ${className}`;
  const vtAttr = vtCover ? { "data-vt-cover": true } : {};
  if (!canOptimizeCover(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        {...(eager ? { fetchPriority: "high" as const } : {})}
        {...vtAttr}
        className={cls}
      />
    );
  }
  return (
    <Image
      src={src}
      alt=""
      // 종횡비 힌트(4:3) — 표시 크기는 호출측 클래스가 소유(object-cover 로 크롭).
      width={640}
      height={480}
      sizes={sizes}
      priority={eager}
      {...vtAttr}
      className={cls}
    />
  );
}
