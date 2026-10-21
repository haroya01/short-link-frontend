"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { consumePublishCelebration } from "@/modules/blog/lib/celebrate-publish";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** celebrate-publish 가 sessionStorage 에 남긴 슬러그를 소비할 때만 한 번 뜬다. pointer-events 없음. */

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
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!consumePublishCelebration(slug)) return;
    setPhase("in");
    const out = window.setTimeout(() => setPhase("out"), 2100);
    const off = window.setTimeout(() => setPhase("off"), 2500);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(off);
    };
  }, [slug]);

  return (
    <>
      <p role="status" className="sr-only">
        {phase === "in" ? t("publishedStatus") : ""}
      </p>
      {phase !== "off" && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
          {!reduced &&
            phase === "in" &&
            STRIPS.map((s, i) => (
              <span
                key={i}
                className={`absolute top-0 block rounded-sm ${s.cls}`}
                style={{
                  left: `${s.left}%`,
                  width: s.w,
                  height: s.h,
                  // 낙하는 하우스 곡선(감속)이 아니라 linear 여야 자연스럽다.
                  animation: `celebrate-fall ${s.dur}ms linear ${s.delay}ms both`,
                  "--drift": `${s.drift}px`,
                  "--spin": `${s.spin}deg`,
                } as React.CSSProperties}
              />
            ))}

          <div className="absolute left-1/2 top-[4.5rem] -translate-x-1/2">
            <div className={phase === "in" ? "celebrate-pill-in" : "animate-fade-out"}>
              <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-2.5 pl-3 pr-5 shadow-card-hover dark:border-slate-700 dark:bg-slate-900">
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
      )}
    </>
  );
}
