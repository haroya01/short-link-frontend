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

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setSeries([]);
      return;
    }
    let alive = true;
    listSubscribedSeries()
      .then((s) => alive && (setSeries(s), setSelectedAuthor(null)))
      .catch(() => alive && setSeries([]));
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

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
