"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTransitionRouter } from "next-view-transitions";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SeriesIndex } from "@/modules/blog/components/series-index";
import { postHref } from "@/modules/blog/components/feed-card";
import type { PublicPostSeriesNav } from "@/modules/blog/api/public-posts";

/** 수평 의도 판별: 첫 이동에서 이 각도(≈30°)보다 평평하고 아래 거리 이상이면 스와이프로 본다. */
const ANGLE_RATIO = 1.7; // |dx| > |dy| * 1.7  → 수평(≈30° 이내)
const CLAIM_PX = 10; // 이 거리 넘어야 방향 판정(작은 떨림 무시)
// 확정 임계 — 뷰포트 폭의 이 비율을 넘겼거나, 넘긴 채 충분히 빠르게 놓으면 회차 전환.
const CONFIRM_RATIO = 0.28;
const FLING_VELOCITY = 0.5; // px/ms
const FLING_MIN_PX = 48; // 플링으로 확정하려면 최소 이만큼은 이동해야(작은 플릭·오탭 무시)

type Dir = "prev" | "next";

function reduceMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** 시작 지점 조상 중 가로로 스크롤 가능한(코드블록·표) 요소가 있으면 그 제스처는 그쪽 것 — 스와이프 무시. */
function startsInHorizontalScroller(target: EventTarget | null, stop: HTMLElement): boolean {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== stop) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * 시리즈 회차 카드 덱 — 모바일에서 읽기 화면을 좌우로 스와이프해 이전/다음 회차로 넘긴다. 본문이 손가락을
 * 따라 밀리고(finger-attached), 들어오는 회차 카드가 가장자리에서 따라 들어오며, 임계를 넘겨 놓으면 스프링
 * 으로 확정해 해당 회차로 소프트 내비게이션한다(각 회차는 자기 URL 유지 · SSR/SEO 불변). 데스크톱은 아래
 * SeriesSwitchButtons 가 배너에서 같은 전환을 담당하므로 여기선 제스처만 — 포인터가 굵은(마우스) 입력이면
 * 관여하지 않는다. reduce-motion 이면 애니메이션 없이 즉시 이동.
 *
 * 세로 스크롤(읽기)·코드블록/표 가로 스크롤과 공존하도록 첫 이동에서 수평 의도를 각도로 판별하고, 가로
 * 스크롤 조상에서 시작한 제스처는 놓아준다. 시리즈가 아닌 글에는 렌더되지 않는다(호출부에서 gate).
 */
export function SeriesSwipe({
  series,
  username,
  locale,
  children,
}: {
  /** 시리즈 회차 네비. undefined(시리즈 아님)면 제스처 없이 children 을 그대로 통과시킨다. */
  series?: PublicPostSeriesNav;
  username: string;
  locale: string;
  children: ReactNode;
}) {
  if (!series) return <>{children}</>;
  return (
    <SeriesSwipeInner series={series} username={username} locale={locale}>
      {children}
    </SeriesSwipeInner>
  );
}

function SeriesSwipeInner({
  series,
  username,
  locale,
  children,
}: {
  series: PublicPostSeriesNav;
  username: string;
  locale: string;
  children: ReactNode;
}) {
  const router = useTransitionRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const prev = series.prev;
  const next = series.next;

  // 드래그 상태(리렌더 유발 없이 rAF 로 transform 만 갱신). offset = 현재 본문 이동량(px, +는 오른쪽).
  const drag = useRef({
    active: false,
    claimed: null as null | "h" | "v",
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    offset: 0,
    pointerId: -1,
  });
  // 들어오는 회차 카드를 마운트할지(가장자리 peek). 드래그로 그 방향에 회차가 있을 때만.
  const [peek, setPeek] = useState<Dir | null>(null);
  const [animating, setAnimating] = useState(false);

  const target = useCallback(
    (dir: Dir) => (dir === "next" ? next : prev),
    [next, prev],
  );

  const pathnameFor = useCallback(
    (slug: string) => {
      // postHref 는 배포에 따라 절대(blog.kurl.me/@user/slug, same-origin) 또는 상대(/{locale}/p/...).
      // 소프트 내비를 위해 항상 pathname 만 뽑는다(same-origin 일 때만 router 가 처리, 아니면 폴백).
      const href = postHref(username, slug, locale);
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return href; // cross-origin → 하드
        return url.pathname + url.search + url.hash;
      } catch {
        return href;
      }
    },
    [username, locale],
  );

  const go = useCallback(
    (dir: Dir) => {
      const t = target(dir);
      if (!t) return;
      const dest = pathnameFor(t.slug);
      if (dest.startsWith("http")) {
        window.location.assign(dest); // cross-origin 배포 폴백(하드 내비)
      } else {
        router.push(dest);
      }
    },
    [target, pathnameFor, router],
  );

  const applyTransform = useCallback((px: number) => {
    if (trackRef.current) trackRef.current.style.transform = px ? `translate3d(${px}px,0,0)` : "";
  }, []);

  // 스프링 복귀/확정 애니메이션(CSS transition 로 --ease 스프링감). reduce-motion 이면 즉시.
  const settle = useCallback(
    (to: number, then?: () => void) => {
      const el = trackRef.current;
      if (!el || reduceMotion()) {
        applyTransform(0);
        then?.();
        return;
      }
      setAnimating(true);
      el.style.transition = "transform 340ms var(--ease)";
      applyTransform(to);
      const done = () => {
        el.style.transition = "";
        el.removeEventListener("transitionend", done);
        setAnimating(false);
        then?.();
      };
      el.addEventListener("transitionend", done);
      // transitionend 누락 대비 타임아웃 폴백.
      window.setTimeout(done, 420);
    },
    [applyTransform],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // 마우스는 데스크톱 버튼이 담당 — 굵은 포인터는 관여 안 함(hover 가능 기기 = 마우스).
      if (e.pointerType === "mouse") return;
      if (animating) return;
      if (!prev && !next) return;
      const container = containerRef.current;
      if (!container) return;
      if (startsInHorizontalScroller(e.target, container)) return;
      const d = drag.current;
      d.active = true;
      d.claimed = null;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.lastX = e.clientX;
      d.lastT = performance.now();
      d.velocity = 0;
      d.offset = 0;
      d.pointerId = e.pointerId;
    },
    [animating, prev, next],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = drag.current;
      if (!d.active || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.claimed === null) {
        if (Math.abs(dx) < CLAIM_PX && Math.abs(dy) < CLAIM_PX) return;
        // 수평 의도: 평평하게(각도 작게) 그으면 스와이프, 아니면 세로 스크롤에 양보하고 이 제스처 종료.
        if (Math.abs(dx) > Math.abs(dy) * ANGLE_RATIO) {
          d.claimed = "h";
          try {
            (e.target as HTMLElement).setPointerCapture?.(d.pointerId);
          } catch {
            /* capture 실패해도 이동은 추적된다 */
          }
        } else {
          d.claimed = "v";
          d.active = false;
          return;
        }
      }
      if (d.claimed !== "h") return;

      // 속도 추적(플링 판정용).
      const now = performance.now();
      const dt = now - d.lastT;
      if (dt > 0) d.velocity = (e.clientX - d.lastX) / dt;
      d.lastX = e.clientX;
      d.lastT = now;

      // 그 방향에 회차가 없으면 고무줄 저항(0.35배)만 주고 카드 peek 은 없음.
      const dir: Dir = dx < 0 ? "next" : "prev"; // 왼쪽으로 밀면 다음, 오른쪽이면 이전
      const has = dir === "next" ? !!next : !!prev;
      const resisted = has ? dx : dx * 0.35;
      d.offset = resisted;
      applyTransform(resisted);
      setPeek(has ? dir : null);
      e.preventDefault();
    },
    [applyTransform, next, prev],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent) => {
      const d = drag.current;
      if (!d.active && d.claimed !== "h") {
        d.active = false;
        return;
      }
      if (e.pointerId !== d.pointerId) return;
      const wasH = d.claimed === "h";
      d.active = false;
      d.claimed = null;
      if (!wasH) return;

      const width = containerRef.current?.clientWidth ?? window.innerWidth;
      const dx = d.offset;
      const dir: Dir = dx < 0 ? "next" : "prev";
      const has = dir === "next" ? !!next : !!prev;
      const passedDist = Math.abs(dx) > width * CONFIRM_RATIO;
      // 플링: 빠른 손짓이면 짧은 거리라도 확정 — 단 최소 거리(작은 떨림·오탭 방지)와 방향 일치 필요.
      const fling =
        Math.abs(dx) > FLING_MIN_PX &&
        Math.abs(d.velocity) > FLING_VELOCITY &&
        ((dir === "next" && d.velocity < 0) || (dir === "prev" && d.velocity > 0));

      if (has && (passedDist || fling)) {
        // 확정 — 카드가 화면 밖으로 스프링 아웃한 뒤 소프트 내비(뷰가 곧 교체되므로 peek 유지).
        settle(dir === "next" ? -width : width, () => go(dir));
      } else {
        // 취소 — 스프링 복귀.
        settle(0, () => setPeek(null));
      }
    },
    [next, prev, settle, go],
  );

  // 인접 회차 프리로드 — 확정 시 즉발이 되게(덱 느낌엔 옆 카드가 실려 있어야). 데스크톱 배너 버튼
  // 호버 시에도 프리페치되지만, 모바일은 첫 페인트 직후 한 번 깔아둔다.
  useEffect(() => {
    const slugs = [prev?.slug, next?.slug].filter(Boolean) as string[];
    for (const slug of slugs) {
      const dest = pathnameFor(slug);
      if (!dest.startsWith("http")) {
        try {
          router.prefetch?.(dest);
        } catch {
          /* prefetch 는 best-effort */
        }
      }
    }
  }, [prev?.slug, next?.slug, pathnameFor, router]);

  // 데스크톱 배너 버튼(SeriesSwitchButtons)이 쏘는 요청 — 같은 카드 슬라이드 전환 후 이동. 모바일 제스처와
  // 로직을 공유(같은 settle+go). reduce-motion 은 settle 안에서 즉시 처리.
  useEffect(() => {
    const onGo = (ev: Event) => {
      const dir = (ev as CustomEvent<Dir>).detail;
      const has = dir === "next" ? !!next : !!prev;
      if (!has || animating) return;
      const width = containerRef.current?.clientWidth ?? window.innerWidth;
      setPeek(dir);
      // 다음 프레임에 트랙을 화면 밖으로 밀어 카드가 흘러 나가게 한 뒤 내비.
      requestAnimationFrame(() => settle(dir === "next" ? -width : width, () => go(dir)));
    };
    const node = containerRef.current;
    node?.addEventListener("series:go", onGo as EventListener);
    return () => node?.removeEventListener("series:go", onGo as EventListener);
  }, [next, prev, animating, settle, go]);

  return (
    <div
      ref={containerRef}
      data-series-swipe=""
      className="relative"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // pan-y: 세로 스크롤은 브라우저에 맡기고 가로 제스처만 우리가 가져온다(수평 확정 후 preventDefault).
      // <sm 에서만 의미 — 데스크톱(마우스)은 onPointerDown 초입에서 빠진다.
      style={{ touchAction: "pan-y" }}
    >
      {/* 들어오는 회차 카드 — 미는 반대쪽 가장자리에서 본문과 함께 딸려 들어온다. 본문 트랙과 같은
          transform 을 타도록 트랙 안에 절대배치. peek 방향에 따라 좌/우 바깥에 대기. */}
      <div ref={trackRef} className="will-change-transform">
        {peek === "next" && next && (
          <EdgeCard side="right" dir="next" title={next.title} n={series.position + 1} />
        )}
        {peek === "prev" && prev && (
          <EdgeCard side="left" dir="prev" title={prev.title} n={series.position - 1} />
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * 데스크톱 배너의 이전/다음 회차 버튼 — 클릭 시 위 {@link SeriesSwipe} 에 `series:go` 를 쏴 같은 카드
 * 슬라이드 전환 후 이동시킨다(마우스라 제스처는 안 걸리므로 버튼이 그 진입점). 없는 방향은 비활성.
 * 호버 시 대상 회차를 프리페치. SeriesNav 배너에서 렌더.
 */
export function SeriesSwitchButtons({
  series,
  username,
  locale,
}: {
  series: PublicPostSeriesNav;
  username: string;
  locale: string;
}) {
  const t = useTranslations("publicPost");
  const router = useTransitionRouter();

  const dispatch = (dir: Dir) => {
    const host =
      typeof document !== "undefined"
        ? (document.querySelector("[data-series-swipe]") as HTMLElement | null)
        : null;
    if (host) host.dispatchEvent(new CustomEvent<Dir>("series:go", { detail: dir, bubbles: false }));
    else {
      // 스와이프 래퍼가 없으면(방어) 곧장 이동.
      const slug = dir === "next" ? series.next?.slug : series.prev?.slug;
      if (slug) router.push(postHref(username, slug, locale));
    }
  };

  const prefetch = (slug?: string) => {
    if (!slug) return;
    const href = postHref(username, slug, locale);
    if (!/^https?:\/\//.test(href)) {
      try {
        router.prefetch?.(href);
      } catch {
        /* best-effort */
      }
    }
  };

  const btn =
    "focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-accent-700 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-accent-400";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={btn}
        disabled={!series.prev}
        onMouseEnter={() => prefetch(series.prev?.slug)}
        onClick={() => dispatch("prev")}
        aria-label={t("seriesPrevEpisode")}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn}
        disabled={!series.next}
        onMouseEnter={() => prefetch(series.next?.slug)}
        onClick={() => dispatch("next")}
        aria-label={t("seriesNextEpisode")}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 본문 옆에서 따라 들어오는 회차 카드(peek). 본문 트랙 바깥(±100%)에 절대배치돼 드래그 transform 을 함께
 *  탄다 — 손가락을 따라 가장자리에서 미끄러져 들어오는 "다음 카드"의 실체. */
function EdgeCard({
  side,
  dir,
  title,
  n,
}: {
  side: "left" | "right";
  dir: Dir;
  title: string;
  n: number;
}) {
  const t = useTranslations("publicPost");
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-16 w-[86%] max-w-sm sm:top-24 ${
        side === "right" ? "left-full ml-4" : "right-full mr-4"
      }`}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-accent-700 dark:text-accent-400">
          {dir === "prev" ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          {t(dir === "next" ? "seriesNextUp" : "seriesPrevUp")}
        </span>
        <SeriesIndex n={n} className="mt-2 block text-[12px]" />
        <span className="mt-0.5 block text-[17px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
          {title}
        </span>
      </div>
    </div>
  );
}
