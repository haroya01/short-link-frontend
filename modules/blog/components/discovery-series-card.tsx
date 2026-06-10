"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { DATE_LOCALE } from "@/lib/date";
import { Mark } from "@/components/common/logo";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { Link as TransitionLink } from "next-view-transitions";
import { SeriesSubscribeButton } from "@/modules/blog/components/series-subscribe-button";
import { BrandTick } from "@/modules/blog/components/rail-heading";

/**
 * Series tile for the discovery grid — a deck of **full-size episode cards** you flip through. Each
 * episode is its own big theme-gradient cover (series name + 01 + episode title); the next episodes
 * peek behind it like a real deck. It flips one card at a time — auto while idle (pauses on
 * hover/focus, respects reduced-motion), and the front card's right edge / the dots flip manually.
 * The front card opens that episode; the series name opens the series.
 */

// 이미지 없는 에피소드 페이지 = 라이트 "종이". 진초록 덱은 featured(오늘의 글) 타일과 같은
// "크고 어두운 타일"이라 첫 화면에서 주인공 경합이 났다 — 흰 바탕 + 그린 액센트로 반전해
// "오늘의 글 > 시리즈 추천" 위계를 세운다. 에피소드별로 틴트만 미묘하게 달라진다.
const EP_GRADS = [
  "from-white via-accent-50/70 to-accent-100/60",
  "from-accent-50/80 via-white to-slate-50",
  "from-white via-slate-50 to-accent-50/70",
  "from-accent-50/60 via-white to-white",
];
const MAX = 4;
const AUTOPLAY_MS = 3400;

export function DiscoverySeriesCard({
  series,
  locale,
}: {
  series: PublicSeriesCard;
  locale: string;
}) {
  const t = useTranslations("publicFeed");
  const posts = (series.posts ?? []).slice(0, MAX);
  const n = posts.length;
  const seriesUrl = authorHref(series.author.username, locale, `series/${series.slug}`);
  // 카드의 글/시리즈 이동도 발견 카드와 같은 통일 전환(소프트 내비일 때만). 절대경로(prod)는 일반 이동.
  const Nav = seriesUrl.startsWith("/") ? TransitionLink : BlogLink;
  const date = new Date(series.lastPublishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });

  const [idx, setIdx] = useState(0);
  // 자동 넘김은 폐기 — 정적인 그리드에서 혼자 3.4s 마다 도는 카드는 화면에서 가장 시끄러운
  // 존재였고(iPad 실기기에서 "깜빡임" 신고), §10.7 의 "ambient 는 희소할 때만"과도 어긋났다.
  // 한 장 넘김은 우측 플립 엣지(수동)만 남는다.
  const advance = () => setIdx((i) => (i + 1) % n);

  if (n === 0) return null;

  return (
    <section aria-label={series.title} className="group">
      {/* 스크린리더에 현재 보이는 에피소드를 알린다(수동 넘김). 시각적으로는 숨김. */}
      <span className="sr-only" aria-live="polite">
        {t("seriesEpisodeOf", { current: idx + 1, total: series.postCount })}
      </span>
      {/* Deck of full-size episode cards. Each card is inset by PEEK on the bottom-right; the back
          cards translate INTO that reserved margin so the deck stays fully inside its own cell and
          never overlaps neighbours. */}
      <div className="relative aspect-[4/5]">
        {posts.map((p, i) => {
          const order = (i - idx + n) % n; // 0 = front
          const front = order === 0;
          const hidden = order >= 3;
          const PEEK = 14;
          return (
            <div
              key={p.slug}
              aria-hidden={!front}
              // transition-all 은 zIndex 의 이산 점프까지 페인트 사이클에 끌어들여 Safari 에서
              // 전환마다 번쩍였다 — transform/opacity 만 전환하고, translateZ(0) 로 각 페이지를
              // 자기 컴포지터 레이어에 고정해 재래스터 플래시를 막는다.
              className="absolute transition-[transform,opacity] duration-500 ease-[var(--ease)] will-change-transform"
              style={{
                top: 0,
                left: 0,
                right: PEEK,
                bottom: PEEK,
                // translateZ(0): 각 페이지를 자기 컴포지터 레이어에 고정(Safari 재래스터 플래시 방지).
                transform: `translate(${order * (PEEK / 2)}px, ${order * (PEEK / 2)}px) scale(${1 - order * 0.04}) translateZ(0)`,
                transformOrigin: "bottom right",
                zIndex: n - order,
                opacity: hidden ? 0 : 1,
                pointerEvents: front ? "auto" : "none",
              }}
            >
              <div
                className={`relative h-full w-full overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${
                  // 뒷장은 내용물 없이 중립 종이 — 어두운 사진 모서리가 비죽 나오면 경계선처럼 읽힌다.
                  !front
                    ? "bg-white ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/60"
                    : p.ogImageUrl
                      ? "bg-slate-700 ring-1 ring-white/15"
                      : "bg-white ring-1 ring-accent-200/60 dark:bg-slate-900 dark:ring-accent-500/20"
                } ${
                  front
                    ? "transition-[transform,box-shadow] duration-300 ease-[var(--ease)] group-hover:-translate-y-1 group-hover:shadow-card-hover has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-slate-950"
                    : ""
                }`}
              >
                {front && (p.ogImageUrl ? (
                  // 에피소드에 사진이 있으면 그 사진을 커버로 — 톤 하모나이즈도 글 카드와 동일
                  // 규칙(블렌드 모드 ❌ — iPad Safari 타일 seam/깜빡임, 글 카드 주석 참조).
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.ogImageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover saturate-[.85]" />
                    <div aria-hidden className="absolute inset-0 bg-accent-900/10" />
                  </>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${EP_GRADS[i % EP_GRADS.length]} dark:opacity-[0.06]`} />
                ))}
                {front && p.ogImageUrl && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                )}

                {/* Subscribe (front only) + the whole card → this episode. */}
                {front && (
                  <div className="absolute right-3 top-3 z-20">
                    <SeriesSubscribeButton seriesId={series.id} />
                  </div>
                )}
                {front && (
                  <Nav
                    href={authorHref(series.author.username, locale, p.slug)}
                    aria-label={p.title}
                    className="absolute inset-0 z-10"
                  />
                )}

                {front && (
                <div className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 ${p.ogImageUrl ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                  {/* Series identity (opens series). pr clears the subscribe button at top-right. */}
                  <div className="flex pr-9">
                    <Nav href={seriesUrl} className="pointer-events-auto flex min-w-0 items-center gap-1.5">
                      <Mark className={`h-2.5 w-auto shrink-0 ${p.ogImageUrl ? "" : "text-accent-600 dark:text-accent-400"}`} animated />
                      <span className="truncate text-[12px] font-semibold tracking-wide">{series.title}</span>
                    </Nav>
                  </div>

                  {/* Episode number(+total) + title (the card's subject). */}
                  <div>
                    <p className={`font-mono font-bold leading-none tabular-nums ${p.ogImageUrl ? "text-white/85" : "text-accent-700 dark:text-accent-400"}`}>
                      <span className="text-[34px]">{String(i + 1).padStart(2, "0")}</span>
                      <span className={`text-[15px] ${p.ogImageUrl ? "text-white/70" : "text-slate-500 dark:text-slate-400"}`}> / {String(series.postCount).padStart(2, "0")}</span>
                    </p>
                    <h3 className="mt-2 line-clamp-3 text-balance text-[18px] font-bold leading-tight tracking-tight">
                      {p.title}
                    </h3>
                    <div className={`mt-2.5 flex items-center gap-1.5 text-[12px] ${p.ogImageUrl ? "text-white/85" : "text-slate-600 dark:text-slate-400"}`}>
                      <Avatar src={series.author.avatarUrl} name={series.author.username} size="xs" />
                      <span className="truncate font-medium">{series.author.username}</span>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">{date}</span>
                    </div>
                  </div>
                </div>
                )}

                {/* Right flip edge → next episode (한 장 넘김). top-14: 우상단 구독 버튼 히트박스를 비워둬
                    겹치지 않게(예전엔 inset-y-0 z-30 이 구독 버튼을 덮어 구독 탭이 거의 안 먹었음). */}
                {front && n > 1 && (
                  <button
                    type="button"
                    onClick={advance}
                    aria-label={t("seriesNextEpisode")}
                    className="absolute bottom-0 right-0 top-14 z-30 flex w-12 items-center justify-center bg-gradient-to-l from-black/30 to-transparent text-white/85 transition hover:text-white"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 모바일 1열 리스트용 시리즈 인서트 — 메이슨리 덱 타일(4:5 비주얼)을 리스트에 그대로 끼우면
 * 화면을 가득 채우는 빈 비주얼 블록이 돼 읽기 흐름을 깬다(아이패드/모바일 실기기 신고).
 * FeedCard 행과 같은 타이포 문법의 조용한 행: 시리즈 라벨 + 제목 + 최신화 + 메타 + 구독.
 */
export function DiscoverySeriesRow({ series, locale }: { series: PublicSeriesCard; locale: string }) {
  const t = useTranslations("publicFeed");
  const seriesUrl = authorHref(series.author.username, locale, `series/${series.slug}`);
  const Nav = seriesUrl.startsWith("/") ? TransitionLink : BlogLink;
  const latest = (series.posts ?? [])[series.posts ? series.posts.length - 1 : 0];
  const date = new Date(series.lastPublishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
  });
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-800 dark:text-slate-200">
          <BrandTick />
          {t("seriesEyebrow")}
        </span>
        <SeriesSubscribeButton seriesId={series.id} />
      </div>
      <Nav href={seriesUrl} className="group mt-1.5 block rounded focus-ring">
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
          {series.title}
        </h3>
        {latest && (
          <p className="mt-1 line-clamp-1 text-[14px] text-slate-500 dark:text-slate-400">{latest.title}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <Avatar src={series.author.avatarUrl} name={series.author.username} size="xs" />
          <span className="truncate font-medium">{series.author.username}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{t("seriesEpisodeCount", { count: series.postCount })}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{date}</span>
        </div>
      </Nav>
    </div>
  );
}
