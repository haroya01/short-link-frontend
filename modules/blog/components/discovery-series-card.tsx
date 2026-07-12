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
import { CoverMorphLink } from "@/modules/blog/components/cover-morph-link";
import { Link as TransitionLink } from "next-view-transitions";
import { SeriesSubscribeButton } from "@/modules/blog/components/series-subscribe-button";

/**
 * Series tile for the discovery grid — full-size episode pages you flip through in place. Each
 * episode is its own big cover (series name + 01 + episode title); the right edge flips to the next
 * one as a quiet crossfade. The front page opens that episode; the series name opens the series.
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
    timeZone: "Asia/Seoul",
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
      {/* Episode pages stacked in one spot — only the front one shows; flipping is an in-place
          crossfade(+미세 스케일). 예전의 "덱 peek"(뒷장 모서리를 오른쪽-아래로 노출)은 카드 밑에
          물결처럼 겹친 띠를 만들고, 앞장을 셀에서 14px 들여 앉혀 둥근 실루엣이 각진 사각형
          덩어리로 읽혔다 — 폐기하고 카드가 셀을 꽉 채운다. */}
      <div className="relative aspect-[4/5]">
        {posts.map((p, i) => {
          const order = (i - idx + n) % n; // 0 = front
          const front = order === 0;
          return (
            <div
              key={p.slug}
              aria-hidden={!front}
              // transition-all 은 zIndex 의 이산 점프까지 페인트 사이클에 끌어들여 Safari 에서
              // 전환마다 번쩍였다 — transform/opacity 만 전환하고, translateZ(0) 로 각 페이지를
              // 자기 컴포지터 레이어에 고정해 재래스터 플래시를 막는다.
              className="absolute inset-0 transition-[transform,opacity] duration-500 ease-[var(--ease)]"
              style={{
                transform: `scale(${front ? 1 : 0.97}) translateZ(0)`,
                zIndex: front ? 2 : 1,
                opacity: front ? 1 : 0,
                pointerEvents: front ? "auto" : "none",
              }}
            >
              <div
                data-vt-cover-scope
                className={`relative h-full w-full overflow-hidden rounded-card-lg shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${
                  // 뒷장은 내용물 없이 중립 종이 — 넘김 크로스페이드 중 빈 장이 어둡게 비치지 않게.
                  !front
                    ? "bg-white ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/60"
                    : p.ogImageUrl
                      ? "bg-slate-700 ring-1 ring-white/15"
                      : "bg-white ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/60"
                } ${
                  front
                    ? "transition-[transform,box-shadow] duration-300 ease-[var(--ease)] group-hover:-translate-y-1 group-hover:shadow-card-hover motion-reduce:transform-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-slate-950"
                    : ""
                }`}
              >
                {front && (p.ogImageUrl ? (
                  // 에피소드에 사진이 있으면 그 사진을 커버로 — 톤 하모나이즈도 글 카드와 동일
                  // 규칙(블렌드 모드 ❌ — iPad Safari 타일 seam/깜빡임, 글 카드 주석 참조).
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.ogImageUrl} alt="" loading="lazy" data-vt-cover className="img-fade absolute inset-0 h-full w-full object-cover saturate-[.85]" />
                    <div aria-hidden className="absolute inset-0 bg-accent-900/10" />
                  </>
                ) : (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${EP_GRADS[i % EP_GRADS.length]} dark:opacity-[0.06]`} />
                    {/* 소프트 그린 글로우 — 평면 틴트에 깊이(라이트 블룸이라 무거워지지 않음 → featured
                        타일과의 주인공 경합 회피 결정 보존). 큰 회차 번호는 사진/종이 공통 모티프라 아래
                        공유 블록으로 뺐다(통일성). */}
                    <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent-300/30 blur-3xl dark:bg-accent-500/10" />
                    <div aria-hidden className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-accent-200/30 blur-3xl dark:bg-accent-500/[0.06]" />
                  </>
                ))}
                {front && p.ogImageUrl && (
                  <>
                    {/* 위 스크림: 사진이 밝아도 시리즈 eyebrow·구독 토글이 읽힌다. 아래 스크림: 번호·제목
                        가독 + 시네마틱(2/3 높이로 깊게, via 단계로 부드럽게). 블렌드 모드는 여전히 ❌. */}
                    <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />
                    <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  </>
                )}

                {/* 회차 번호 = 표지의 공통 주인공(사진/종이 통일): 같은 위치·크기, 필드에 따라 색만 —
                    종이는 그린 그라디언트, 사진은 흰 번호(스크림 위, drop-shadow 가독). 빈 가운데를 채운다. */}
                {front && (
                  <div aria-hidden className="pointer-events-none absolute left-4 top-[15%] z-10 select-none font-mono font-bold leading-[0.8] tracking-tighter tabular-nums">
                    <span
                      className={
                        p.ogImageUrl
                          ? "text-[112px] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                          : "bg-gradient-to-br from-accent-600 to-accent-300 bg-clip-text text-[112px] text-transparent dark:from-accent-400 dark:to-accent-600"
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`ml-1.5 align-top text-[22px] font-bold ${p.ogImageUrl ? "text-white/75" : "text-accent-500/45 dark:text-accent-400/45"}`}>
                      /{String(series.postCount).padStart(2, "0")}
                    </span>
                  </div>
                )}

                {/* Subscribe (front only) + the whole card → this episode. */}
                {front && (
                  <div className="absolute right-3 top-3 z-20">
                    <SeriesSubscribeButton seriesId={series.id} />
                  </div>
                )}
                {front && (() => {
                  // 사진 있는 에피소드 장만 커버 모핑(소프트 내비 한정) — 종이 장은 피사체가 없다.
                  const EpNav = Nav === TransitionLink && p.ogImageUrl ? CoverMorphLink : Nav;
                  return (
                    <EpNav
                      href={authorHref(series.author.username, locale, p.slug)}
                      aria-label={p.title}
                      className="absolute inset-0 z-10"
                    />
                  );
                })()}

                {front && (
                <div className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 ${p.ogImageUrl ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                  {/* Series identity (opens series). pr clears the subscribe button at top-right. */}
                  <div className="flex pr-9">
                    <Nav
                      href={seriesUrl}
                      // -m/p pair: ≥24px tap box without visual change (target-size on touch).
                      className="pointer-events-auto -mx-1 -my-1.5 flex min-w-0 items-center gap-1.5 rounded px-1 py-1.5"
                    >
                      <Mark className={`h-2.5 w-auto shrink-0 ${p.ogImageUrl ? "" : "text-accent-600 dark:text-accent-400"}`} animated />
                      <span className="truncate text-[12px] font-semibold tracking-wide">{series.title}</span>
                    </Nav>
                  </div>

                  {/* 제목 — 사진/종이 공통(큰 회차 번호가 표지 주인공, 제목은 하단에 일관 크기로). */}
                  <div>
                    <h3 className="line-clamp-3 text-balance text-card-title-md font-bold leading-snug tracking-tight">
                      {p.title}
                    </h3>
                    <div className={`mt-2.5 flex items-center gap-1.5 text-[12px] ${p.ogImageUrl ? "text-white/85" : "text-slate-600 dark:text-slate-400"}`}>
                      {/* Author (avatar + name) opens their profile — an island above the card's post
                          overlay (pointer-events re-enabled), same as the series eyebrow above. */}
                      <Nav
                        href={authorHref(series.author.username, locale)}
                        className="pointer-events-auto -mx-1 -my-1 flex min-w-0 items-center gap-1.5 rounded px-1 py-1"
                      >
                        <Avatar src={series.author.avatarUrl} name={series.author.username} size="xs" />
                        <span className="truncate font-medium">{series.author.username}</span>
                      </Nav>
                      <span aria-hidden>·</span>
                      <span className="shrink-0">{date}</span>
                    </div>
                    {/* 시리즈 진행 막대 — 이 회차가 전체에서 어디쯤인지(덱 길이 + 현재 위치를 조용히
                        알림). 사진 장은 화이트, 종이 장은 브랜드 그린. */}
                    <div className={`mt-3 h-[3px] w-full overflow-hidden rounded-full ${p.ogImageUrl ? "bg-white/25" : "bg-slate-200 dark:bg-slate-700/60"}`}>
                      <div
                        className={`h-full rounded-full ${p.ogImageUrl ? "bg-white" : "bg-accent-600 dark:bg-accent-400"}`}
                        style={{ width: `${Math.round(((i + 1) / Math.max(series.postCount, i + 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Right flip edge → next episode (한 장 넘김). top-14: 우상단 구독 버튼 히트박스를 비워둬
                    겹치지 않게(예전엔 inset-y-0 z-30 이 구독 버튼을 덮어 구독 탭이 거의 안 먹었음).
                    상시 깔리던 검은 그라디언트 띠는 흰 종이 장에서 "따로 떨어진 회색 사각형"으로 읽혀
                    폐기 — 평소엔 변형에 맞춘 글리프만 두고, 카드 hover/포커스에서만 페더 스크림이
                    떠오른다. 히트 영역(w-12 풀하이트)은 그대로라 탭 타깃은 안 줄어든다. */}
                {front && n > 1 && (
                  <button
                    type="button"
                    onClick={advance}
                    aria-label={t("seriesNextEpisode")}
                    className={`absolute bottom-0 right-0 top-14 z-30 flex w-12 items-center justify-center transition-colors duration-300 ${
                      p.ogImageUrl
                        ? "text-white/85 hover:text-white"
                        : "text-slate-400 hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-300"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-0 opacity-0 transition-opacity duration-300 ease-[var(--ease)] group-focus-within:opacity-100 group-hover:opacity-100 ${
                        p.ogImageUrl
                          ? "bg-gradient-to-l from-black/25 to-transparent"
                          : "bg-gradient-to-l from-slate-900/[0.04] to-transparent dark:from-white/[0.06]"
                      }`}
                    />
                    <ChevronRight
                      className={`relative h-6 w-6 transition-transform duration-300 ease-[var(--ease)] group-hover:translate-x-0.5 motion-reduce:transform-none ${
                        p.ogImageUrl ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" : ""
                      }`}
                    />
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

// (모바일 리스트용 DiscoverySeriesRow 는 폐기 — 피드가 전 뷰포트 카드 그리드가 되면서 1열에서도
// 덱 카드가 그대로 들어간다. 카드 피드 문법에선 전폭 덱이 "거대한 비주얼 블록"이 아니라 이웃
// 사진 카드들과 같은 결이다.)
