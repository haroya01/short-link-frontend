"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, CalendarPlus, Link2, MapPin, Users } from "lucide-react";

/**
 * 모집을 처음 보는 사람을 위한 애니메이션 설명 — "페이지를 만들고 → 단톡에 링크를 붙이면 → 신청이 쌓인다"
 * 를 9초 루프 데모로 보여준다. 키프레임은 globals.css 의 evi-* 블록.
 */
export function EventsIntro({ mode }: { mode: "anonymous" | "empty" }) {
  const t = useTranslations("events.intro");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <div className="space-y-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
          {t("eyebrow")}
        </p>
        <h1 className="text-balance text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-md text-balance text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 sm:text-[15px]">
          {t("subtitle")}
        </p>
      </div>

      <Demo />

      <ol className="mt-10 border-y border-slate-100 dark:border-slate-800 sm:flex">
        {(["step1", "step2", "step3"] as const).map((step, index) => (
          <li
            key={step}
            className={
              "flex-1 py-5 sm:px-5 " +
              (index > 0
                ? "border-t border-slate-100 dark:border-slate-800 sm:border-l sm:border-t-0"
                : "sm:pl-0")
            }
          >
            <p className="font-mono text-[11px] font-medium text-accent-700 dark:text-accent-400">
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-1.5 text-[14px] font-semibold text-slate-800 dark:text-slate-200">
              {t(`${step}.title`)}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t(`${step}.body`)}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10 text-center">
        {mode === "anonymous" ? (
          <a
            href="/login?next=/events"
            className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-accent-600 px-7 text-base font-semibold text-white transition-colors hover:bg-accent-700 dark:hover:bg-accent-500"
          >
            {t("ctaLogin")}
          </a>
        ) : (
          <Link
            href="/events/new"
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent-600 px-7 text-base font-semibold text-white transition-colors hover:bg-accent-700 dark:hover:bg-accent-500"
          >
            <CalendarPlus className="h-5 w-5" />
            {t("ctaCreate")}
          </Link>
        )}
        <p className="mt-3 text-[13px] text-slate-400 dark:text-slate-500">{t("ctaHint")}</p>
      </div>
    </div>
  );
}

function Demo() {
  const t = useTranslations("events.intro.demo");

  return (
    <div
      aria-hidden
      className="relative mt-10 h-[300px] overflow-hidden rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60 sm:h-[280px]"
    >
      {/* 1) 만든 모집 페이지 (미니어처) — 신청 버튼은 실제 공개면 CTA(초록)를 그대로 축소 */}
      <div className="evi-card absolute left-4 top-4 w-[58%] max-w-[260px] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950">
        <p className="text-[14px] font-bold leading-snug text-slate-900 dark:text-slate-100">
          {t("eventTitle")}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-3 w-3" /> {t("eventDate")}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <MapPin className="h-3 w-3" /> {t("eventPlace")}
        </p>
        <div className="mt-2.5 rounded-lg bg-accent-600 py-1.5 text-center text-[11px] font-semibold text-white">
          {t("registerButton")}
        </div>
      </div>

      {/* 2) 카톡으로 날아가는 링크 */}
      <div className="evi-fly absolute bottom-[104px] right-4 flex items-center gap-1 rounded-full border border-accent-300 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-accent-700 shadow-sm dark:border-accent-700 dark:bg-slate-950 dark:text-accent-400">
        <Link2 className="h-3 w-3" /> kurl.me/ab3xk
      </div>

      {/* 3) 단톡방 — 링크가 도착하고 신청이 쌓인다 */}
      <div className="absolute bottom-4 right-4 flex w-[46%] max-w-[210px] flex-col items-end gap-1.5">
        <div className="evi-bubble w-full rounded-2xl rounded-tr-sm bg-amber-300 px-3 py-2 text-[12px] font-medium leading-snug text-slate-900">
          {t("chatShare")}
          <span className="mt-1 flex items-center gap-1 rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[10px] text-accent-700">
            <Link2 className="h-2.5 w-2.5" /> kurl.me/ab3xk
          </span>
        </div>
        <div className="evi-r1 rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
          {t("reply1")}
        </div>
        <div className="evi-r2 rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
          {t("reply2")}
        </div>
        <div className="evi-r3 rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
          {t("reply3")}
        </div>
      </div>

      {/* 4) 결과 배지 */}
      <div className="evi-badge absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-accent-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-md">
        <Users className="h-3.5 w-3.5" /> {t("badge")}
      </div>
    </div>
  );
}
