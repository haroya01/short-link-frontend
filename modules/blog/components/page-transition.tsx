"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Per-navigation entry transition. Lives in a Next `template.tsx`, which re-mounts on every route
 * change — so each navigation re-runs this `initial → animate`. `prefers-reduced-motion` collapses
 * any mode to an instant opacity swap.
 *
 * Two modes, chosen per surface so a page isn't double-animated:
 * - `settle` (default, blog workspace/feed): a quiet fade + 6px settle + a hair of scale — the page
 *   composes in place. These surfaces have no per-component entrance, so this IS the entrance.
 * - `fade` (public profile/post, link-in-bio, links product): opacity-only. Those surfaces already
 *   run their own CSS content entrance (profile-fade / hero-stagger); a plain
 *   crossfade on route change rides on top WITHOUT adding a second "rise from the bottom".
 */
export function PageTransition({
  children,
  mode = "settle",
}: {
  children: ReactNode;
  mode?: "settle" | "fade";
}) {
  const reduce = useReducedMotion();
  const settle = mode === "settle" && !reduce;
  return (
    <motion.div
      initial={settle ? { opacity: 0, y: 6, scale: 0.995 } : { opacity: 0 }}
      animate={settle ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
      // framer는 var() 참조가 안 되니 --ease(globals.css :root)와 같은 곡선을 배열로 미러링.
      transition={{ duration: mode === "fade" ? 0.2 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      // will-change를 정적으로 박지 않는다: framer가 애니메이션 동안에만 자동으로 걸고 끝나면 푼다.
      // 정적 transform will-change는 이 페이지 래퍼를 position:fixed 자손의 containing block으로 만들어
      // 모달·시트·FAB가 뷰포트가 아니라 래퍼 박스에 갇히게 한다(페이지 전역 오버레이 깨짐).
    >
      {children}
    </motion.div>
  );
}
