"use client";

import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth";

/**
 * Guest-only feed masthead — Fork B. 홈 피드에서 비로그인 방문자에게만 브랜드 태그라인을 조용히 한 줄
 * 노출한다(로그인 독자는 지금처럼 글로 바로). FeedMasthead 와 같은 밴드/타이포를 쓰되 sub-line 없이
 * 한 줄만(마케팅 히어로 아님).
 *
 * auth 는 클라이언트에서만 읽는다(useAuth = 마운트 후 /me). 서버 cookies() 를 쓰지 않으므로 홈 피드
 * 라우트가 정적/캐시 상태를 유지한다(과거 cookies() 가 라우트를 통째로 동적 강등시킨 사고 회피).
 * `ready` 전에는 렌더하지 않아 로그인 독자에게 밴드가 번쩍였다 사라지는 깜빡임이 없다 — SSR·첫
 * 클라이언트 렌더가 모두 null 로 일치(하이드레이션 불일치 없음), 비로그인일 때만 한 번 조용히 뜬다.
 */
export function GuestMasthead() {
  const t = useTranslations("publicFeed");
  const { authenticated, ready } = useAuth();
  if (!ready || authenticated) return null;
  return (
    <section className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-14">
        <div className="hero-stagger max-w-2xl">
          <h1 className="text-balance text-headline-sm font-semibold leading-[1.15] tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg sm:leading-[1.1]">
            {t("mastheadTagline")}
          </h1>
        </div>
      </div>
    </section>
  );
}
