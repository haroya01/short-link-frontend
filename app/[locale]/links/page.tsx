"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ShortenPanel, type ShortenedEntry } from "@/components/links/shorten/shorten-panel";
import { HomeStatsExample } from "@/components/landing/home-stats-example";
import { HomeRecent } from "@/components/links/home-recent";
import { useAuth } from "@/lib/auth";
import { useRecentLinks } from "@/lib/recent-links";
import { useSharedUrl } from "@/lib/use-shared-url";
import { Link, useRouter } from "@/i18n/navigation";


export default function HomePage() {
  const { authenticated, ready } = useAuth();
  const t = useTranslations("home");
  const locale = useLocale();
  const headlineSizeClass =
    locale === "ja"
      ? "text-[28px] leading-[1.12] min-[390px]:text-[29px] sm:text-[46px]"
      : locale === "en"
        ? "text-[34px] leading-[1.14] min-[390px]:text-[36px] sm:text-[72px] sm:leading-[1.1]"
        : locale === "vi"
          ? "text-[30px] leading-[1.14] min-[390px]:text-[32px] sm:text-[72px] sm:leading-[1.1]"
          : "text-[38px] leading-[1.14] min-[390px]:text-[40px] sm:text-[72px] sm:leading-[1.1]";
  const [results, setResults] = useState<ShortenedEntry[] | null>(null);
  const recent = useRecentLinks();
  // 공유로 들어온 쿼리는 useSharedUrl 이 곧 지우므로, 대시보드로 넘길 원본을 첫 렌더에 잡아 둔다.
  const arrivedWith = useRef(typeof window === "undefined" ? "" : window.location.search);
  const sharedUrl = useSharedUrl();
  const router = useRouter();
  // 로그인한 사람의 홈은 대시보드다. 첫 로드는 pre-paint 스크립트가 이미 넘겼고, 여긴 앱 안에서 "/" 로
  // 온 경우.
  useEffect(() => {
    if (!ready || !authenticated) return;
    router.replace(`/dashboard${arrivedWith.current}`);
  }, [ready, authenticated, router]);

  if (ready && authenticated) return <div className="min-h-screen" />;

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-white dark:bg-slate-950">
        <div className="container relative z-10 max-w-5xl pb-12 pt-14 sm:pb-16 sm:pt-24">
          <div className="mb-9 max-w-3xl space-y-5 sm:mb-11 sm:space-y-6">
            <h1
              data-testid="home-hero-heading"
              className={`text-balance font-bold tracking-[-0.035em] text-slate-900 dark:text-slate-100 ${headlineSizeClass}`}
            >
              <span>
                {t.rich("headline1", {
                  line: (chunks) => <span className="brand-underline">{chunks}</span>,
                })}
              </span>
              <br />
              <span className="font-medium">{t("headline2")}</span>
            </h1>
            <p
              data-testid="home-hero-subhead"
              className="max-w-xl text-pretty text-[15px] leading-[1.65] text-slate-600 dark:text-slate-300 sm:text-[17px]"
            >
              <span className="sm:hidden">{t("mobileSubhead")}</span>
              <span className="hidden sm:inline">{t("subhead")}</span>
            </p>
          </div>

          {/* 제목·입력칸은 등장 모션 없이 첫 페인트에 그대로 — 여러 번 오는 화면이라 매번 다시
              떠오르는 연출은 붙여 넣기까지의 지연일 뿐이다. */}
          <div>
            {/* 단축이 끝나면 입력 칸이 사라지고 그 자리에 답 줄(ResultLine)이 내려앉는다.
                "다른 주소도 줄이기"를 누르면 빈 칸이 맨 위로 돌아오고 답들은
                영수증처럼 아래로 밀린다. */}
            <ShortenPanel
              authenticated={authenticated}
              ready={ready}
              results={results}
              onResultsChange={setResults}
              initialUrl={sharedUrl ?? undefined}
            />
          </div>

          <div className="mt-5 min-h-[44px] max-w-2xl">
            {(!results || results.length === 0) && !authenticated && recent.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t("anonymousHint")}{" "}
                <Link
                  href="/demo"
                  className="focus-ring inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
                >
                  {t("demoLink")} <ArrowRight aria-hidden className="h-3 w-3" />
                </Link>
              </p>
            ) : null}
          </div>

          <div className="max-w-2xl">
            <HomeRecent exclude={results?.map((r) => r.res.shortCode) ?? []} />
          </div>
        </div>
      </section>

      {/* 글리프 워밍업 — 예시 섹션 제목의 한글 서브셋을 첫 페인트 창에 미리 당긴다.
          늦게 오는 font-face 이벤트가 뷰포트 안 h2 를 LCP 로 재기록하던 것(#710 메커니즘,
          모바일 render delay ~2.9s)의 처방. visibility:hidden 은 폰트 로드를 트리거한다. */}
      <div aria-hidden className="invisible absolute h-0 overflow-hidden">
        <span className="text-headline-sm font-bold">{t("stage.title")}</span>
        <span>{t("stage.desc")}</span>
        <span className="font-semibold">{t("stage.feedTitle")}</span>
        <span className="font-semibold">{t("stage.trendTitle")}</span>
      </div>

      {/* 도구 먼저: 폼·최근 링크가 주인공이고, 설명은 로그아웃 방문자에게만 한 섹션.
          ready 전에는 pre-paint 인증 힌트(data-auth-slot)로 로그인 사용자에게 숨겨 둔다. */}
      {!ready ? (
        <div data-auth-slot="anon">
          <HomeStatsExample />
        </div>
      ) : !authenticated ? (
        <HomeStatsExample />
      ) : null}
    </div>
  );
}
