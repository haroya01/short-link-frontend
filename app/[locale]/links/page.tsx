"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShortenPanel, type ShortenedEntry } from "@/components/links/shorten/shorten-panel";
import { HomeRecent } from "@/components/links/home-recent";
import { FoldDemo } from "@/components/landing/fold-demo";
import { LinkAbilities } from "@/components/landing/link-abilities";
import { useAuth } from "@/lib/auth";
import { useSharedUrl } from "@/lib/use-shared-url";
import { useRouter } from "@/i18n/navigation";


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
        <div className="container relative z-10 pb-12 pt-14 sm:pb-16 sm:pt-[18vh]">
          <div className="mx-auto max-w-2xl">
            <h1
              data-testid="home-hero-heading"
              className={`mb-6 text-balance font-bold tracking-[-0.035em] text-slate-900 dark:text-slate-100 sm:mb-8 sm:text-center ${headlineSizeClass}`}
            >
              {t.rich("headline1", { line: (chunks) => chunks })}
            </h1>

            {!results?.length && <FoldDemo />}

            <ShortenPanel
              authenticated={authenticated}
              ready={ready}
              results={results}
              onResultsChange={setResults}
              initialUrl={sharedUrl ?? undefined}
              foldOnArrive
            />

            <div className="mt-10">
              <HomeRecent exclude={results?.map((r) => r.res.shortCode) ?? []} />
            </div>
          </div>

          <LinkAbilities />
        </div>
      </section>

    </div>
  );
}
