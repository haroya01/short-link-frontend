"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listSubscribedSeries } from "@/modules/blog/api/series-subscription";
import type { PublicAuthor, PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { DiscoveryGrid, DiscoveryCell, DiscoveryGridSkeleton } from "@/modules/blog/components/discovery-card";
import { DiscoverySeriesCard } from "@/modules/blog/components/discovery-series-card";
import { AuthorFilterChips } from "@/modules/blog/components/author-filter-chips";
import { ReadingShell } from "@/modules/blog/components/reading-shell";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";

/**
 * The home feed's "시리즈" tab — series the signed-in viewer subscribes to, latest active first.
 * Authenticated (subscriptions are per-user), so it fetches client-side with the access token, like
 * the 팔로잉 tab. Signed-out viewers get a sign-in prompt; no subscriptions yet → a quiet nudge.
 */
export function SubscribedSeriesFeed({ locale }: { locale: string }) {
  const t = useTranslations("publicFeed");
  const { ready, authenticated, signInWithGoogle } = useAuth();
  const [series, setSeries] = useState<PublicSeriesCard[] | null>(null);
  // 구독한 시리즈를 작가별로 거르는 필터 — 팔로잉 탭과 동일한 아바타 칩 패턴.
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  // 첫 로드 실패를 '구독 없음' 빈 상태와 구분한다(아래 initialError 분기) — reloadKey 로 재조회.
  const [initialError, setInitialError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setSeries([]);
      return;
    }
    setInitialError(false);
    setSeries(null);
    let alive = true;
    listSubscribedSeries()
      .then((s) => alive && (setSeries(s), setSelectedAuthor(null)))
      .catch(() => {
        // 일시적 오류를 빈 상태로 위장하지 않는다 — 별도 오류 분기에서 '다시 시도'를 준다.
        if (alive) setInitialError(true);
      });
    return () => {
      alive = false;
    };
  }, [ready, authenticated, reloadKey]);

  if (initialError) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">{t("loadMoreError")}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-ring dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!ready || series === null) {
    return (
      <div className="mx-auto mt-6 max-w-4xl">
        <DiscoveryGridSkeleton />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <ReadingShell>
        <FeedEmpty
          mark
          title={t("seriesTabSignedOut")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button type="button" onClick={() => signInWithGoogle()} className={blogCta()}>
                {t("seriesTabSignIn")}
              </button>
              <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
                {t("followingBrowseLatest")}
              </Link>
            </div>
          }
        />
      </ReadingShell>
    );
  }

  if (series.length === 0) {
    return (
      <ReadingShell>
        <FeedEmpty
          mark
          title={t("seriesTabEmptyTitle")}
          body={t("seriesTabEmpty")}
          action={
            <Link href="?sort=recent" className={blogCta({ variant: "secondary" })}>
              {t("followingBrowseLatest")}
            </Link>
          }
        />
      </ReadingShell>
    );
  }

  // 구독 시리즈의 작가들(중복 제거) — 작가별 필터용.
  const seriesAuthors: PublicAuthor[] = [];
  const seen = new Set<string>();
  for (const s of series) {
    if (!seen.has(s.author.username)) {
      seen.add(s.author.username);
      seriesAuthors.push(s.author);
    }
  }
  const activeAuthor = selectedAuthor && seen.has(selectedAuthor) ? selectedAuthor : null;
  const shown = activeAuthor ? series.filter((s) => s.author.username === activeAuthor) : series;

  // 다른 발견 탭과 동일한 와이드 카드 그리드 — 구독한 시리즈를 시리즈 덱 카드로. 작가별 필터(아바타 칩) 상단.
  // mt-6: 덱 카드는 크고 위쪽 그림자가 있어 탭에 붙으면 침범처럼 보임 → 다른 탭(mt-4)보다 살짝 더 띄움.
  return (
    <div className="mx-auto mt-6 max-w-4xl">
      <AuthorFilterChips authors={seriesAuthors} active={activeAuthor} onSelect={setSelectedAuthor} />
      <DiscoveryGrid>
        {shown.map((s) => (
          <DiscoveryCell key={s.id}>
            <DiscoverySeriesCard series={s} locale={locale} />
          </DiscoveryCell>
        ))}
      </DiscoveryGrid>
    </div>
  );
}
