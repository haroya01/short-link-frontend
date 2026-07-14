"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { consumePublishCelebration } from "@/modules/blog/lib/celebrate-publish";

/**
 * 발행 직후 도착한 글 페이지에서 딱 한 번 재생되는 축하 연출 — 브랜드 그린 계열 색지 낙하 + "발행됐어요"
 * 필(그린 실이 아래에 그어진다). 에디터가 sessionStorage 에 찍은 슬러그(celebrate-publish 계약)를
 * 소비해서만 뜨므로 일반 열람·새로고침·재발행에는 절대 나타나지 않는다. pointer-events 없음 — 독자
 * (본인)의 첫 읽기를 어떤 식으로도 막지 않는 위에 얹힌 2.5초. Reduced motion 은 색지 없이 필만.
 */

/** 색지 파라미터 — 결정적 상수(런타임 랜덤 없음): 위치·타이밍이 매 재생 동일해도 2.5초 1회라 티 안 남. */
const STRIPS: Array<{
  left: number; // vw %
  delay: number;
  dur: number;
  drift: number; // px horizontal sway by fall end
  spin: number; // deg
  cls: string;
  w: number;
  h: number;
}> = [
  { left: 8, delay: 0, dur: 1750, drift: 34, spin: 260, cls: "bg-accent-600", w: 6, h: 12 },
  { left: 14, delay: 140, dur: 2050, drift: -28, spin: -300, cls: "bg-accent-300", w: 5, h: 10 },
  { left: 21, delay: 60, dur: 1600, drift: 22, spin: 200, cls: "bg-slate-300", w: 5, h: 11 },
  { left: 28, delay: 220, dur: 1900, drift: -40, spin: 320, cls: "bg-accent-500", w: 6, h: 12 },
  { left: 34, delay: 20, dur: 1700, drift: 30, spin: -240, cls: "bg-accent-200", w: 5, h: 9 },
  { left: 41, delay: 180, dur: 2150, drift: -18, spin: 280, cls: "bg-accent-600", w: 6, h: 13 },
  { left: 47, delay: 90, dur: 1650, drift: 26, spin: -200, cls: "bg-slate-300", w: 4, h: 10 },
  { left: 53, delay: 260, dur: 1950, drift: -32, spin: 240, cls: "bg-accent-400", w: 6, h: 11 },
  { left: 59, delay: 40, dur: 1800, drift: 20, spin: -320, cls: "bg-accent-200", w: 5, h: 12 },
  { left: 66, delay: 200, dur: 2100, drift: -24, spin: 220, cls: "bg-accent-600", w: 5, h: 10 },
  { left: 72, delay: 120, dur: 1700, drift: 36, spin: -260, cls: "bg-accent-300", w: 6, h: 12 },
  { left: 79, delay: 280, dur: 1850, drift: -20, spin: 300, cls: "bg-slate-300", w: 5, h: 9 },
  { left: 85, delay: 70, dur: 1600, drift: 28, spin: -220, cls: "bg-accent-500", w: 6, h: 11 },
  { left: 92, delay: 240, dur: 2000, drift: -36, spin: 260, cls: "bg-accent-200", w: 5, h: 12 },
];

export function PublishCelebration({ slug }: { slug: string }) {
  const t = useTranslations("publicPost");
  const [phase, setPhase] = useState<"off" | "in" | "out">("off");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!consumePublishCelebration(slug)) return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setPhase("in");
    // 필이 2초쯤 머문 뒤 페이드아웃하고 DOM 에서 사라진다 — 연출은 흔적을 남기지 않는다.
    const out = window.setTimeout(() => setPhase("out"), 2100);
    const off = window.setTimeout(() => setPhase("off"), 2500);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(off);
    };
  }, [slug]);

  if (phase === "off") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {/* 색지 — 브랜드 그린 계열 + 종이 슬레이트, 위에서 흩날리며 떨어진다(모션 축소 시 생략). */}
      {!reduced &&
        phase === "in" &&
        STRIPS.map((s, i) => (
          <span
            key={i}
            className={`absolute top-0 block rounded-[1px] ${s.cls}`}
            style={{
              left: `${s.left}%`,
              width: s.w,
              height: s.h,
              // 낙하는 가속이 자연스러워 단일 이동 곡선(var(--ease)=감속) 대신 linear — 색지들의
              // 지속시간 편차가 흩날림을 만든다.
              animation: `celebrate-fall ${s.dur}ms linear ${s.delay}ms both`,
              "--drift": `${s.drift}px`,
              "--spin": `${s.spin}deg`,
            } as React.CSSProperties}
          />
        ))}

      {/* "발행됐어요" 필 — 체크 디스크 + 문구, 아래로 그린 실이 그어진다(웹로그 시그니처).
          헤더(h-14) 바로 아래 띠에 떠서 제목을 가리지 않는다. */}
      <div className="absolute left-1/2 top-[4.5rem] -translate-x-1/2">
        <div className={phase === "in" ? "celebrate-pill-in" : "animate-fade-out"}>
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/95 py-2.5 pl-3 pr-5 shadow-card-hover backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-700 text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="relative text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              {t("publishedCelebration")}
              <span className="celebrate-thread absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-accent-600" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
