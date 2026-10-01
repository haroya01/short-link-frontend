"use client";

import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth";

/**
 * Guest-only feed masthead — Fork B. 홈 피드에서 비로그인 방문자에게만 "무엇이 모인 곳인지" 한 줄을
 * 읽기 컬럼 위에 노출한다(로그인 독자는 지금처럼 글로 바로). 마케팅 히어로가 아니라 목록의 머리글.
 *
 * auth 는 클라이언트에서만 읽는다(useAuth = 마운트 후 /me). 서버 cookies() 를 쓰지 않으므로 홈 피드
 * 라우트가 정적/캐시 상태를 유지한다(과거 cookies() 가 라우트를 통째로 동적 강등시킨 사고 회피).
 * 서버 HTML 에는 밴드를 넣어 두고 `ready` 전에는 [data-auth-slot="anon"] 으로 감싼다 — 로그인
 * 독자에겐 pre-paint 인증 힌트가 CSS 로 숨기고(헤더와 같은 방식), 비로그인 방문자는 첫 페인트부터
 * 본다. `ready` 뒤에 끼워 넣으면 그 아래 피드가 통째로 밀린다.
 */
export function GuestMasthead() {
  const t = useTranslations("publicFeed");
  const { authenticated, ready } = useAuth();
  if (ready && authenticated) return null;
  return (
    <div data-auth-slot={ready ? undefined : "anon"} className="contents">
      <section className="bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-14">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-balance text-[26px] font-bold leading-[1.2] tracking-headline text-slate-900 dark:text-slate-100 sm:text-[34px]">
              {t("mastheadTagline")}
            </h1>
          </div>
        </div>
      </section>
    </div>
  );
}
