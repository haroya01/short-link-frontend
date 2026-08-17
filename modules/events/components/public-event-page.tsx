"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { UserRound } from "lucide-react";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { Markdown } from "@/modules/blog/components/markdown";
import type { PublicEvent } from "@/modules/events/api/events";
import {
  formatEventDate,
  formatEventRange,
  formatEventTime,
  timezoneLabel,
} from "@/modules/events/lib/format";
import { CancelRegistrationPanel } from "./cancel-registration-panel";
import { RegistrationPanel } from "./registration-panel";

/**
 * 참석자가 보는 초대장 — kurl 종이 문법. 카드 상자·아이콘 타일을 걷어내고 흰 종이 한 컬럼에
 * 헤어라인으로만 단락을 가른다. 색은 브랜드 초록 한 가닥(CTA·라벨)만: 초대장은 조용할수록
 * 이벤트가 주인공이 된다.
 */
export function PublicEventPage({ initialEvent }: { initialEvent: PublicEvent }) {
  const t = useTranslations("events.public");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const cancelToken = searchParams.get("cancel");
  const [event, setEvent] = useState(initialEvent);

  const dateLine = useMemo(
    () => formatEventDate(event.startsAt, event.timezone, locale),
    [event.startsAt, event.timezone, locale],
  );
  const timeLine = useMemo(() => {
    const range = formatEventRange(event.startsAt, event.endsAt, event.timezone, locale);
    return (
      range.split(" · ").slice(1).join(" · ") ||
      formatEventTime(event.startsAt, event.timezone, locale)
    );
  }, [event.startsAt, event.endsAt, event.timezone, locale]);

  const scrollToForm = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nearlyFull = event.spotsLeft != null && event.spotsLeft > 0 && event.spotsLeft <= 3;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <main className="mx-auto w-full max-w-[42rem] px-5 pb-16 pt-8 sm:pt-12">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt=""
            className="mb-7 aspect-[2/1] w-full rounded-2xl object-cover"
          />
        ) : null}

        <h1 className="text-[28px] font-bold leading-[1.25] tracking-tight text-slate-900 dark:text-slate-50 sm:text-[32px]">
          {event.title}
        </h1>

        {event.organizerName ? (
          <div className="mt-3 flex items-center gap-2 text-[14px] text-slate-500 dark:text-slate-400">
            {event.organizerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.organizerAvatarUrl}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            <span>
              {t("hostedBy")}{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {event.organizerName}
              </span>
            </span>
          </div>
        ) : null}

        {/* 일시·장소·인원 — 정의 리스트. 라벨은 초록 소문자 한 줄, 값은 본문 잉크. */}
        <dl className="mt-7 border-t border-slate-200 dark:border-slate-800">
          <MetaRow label={t("metaDate")}>{dateLine}</MetaRow>
          <MetaRow label={t("metaTime")}>
            {timeLine}{" "}
            <span className="text-slate-400 dark:text-slate-500">
              ({timezoneLabel(event.timezone, locale)})
            </span>
          </MetaRow>
          {event.locationText ? (
            <MetaRow label={t("metaPlace")}>
              {event.locationUrl ? (
                <a
                  href={event.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-500"
                >
                  {event.locationText}
                </a>
              ) : (
                event.locationText
              )}
            </MetaRow>
          ) : null}
          {event.onlineUrl ? (
            <MetaRow label={t("metaOnline")}>
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-500"
              >
                {t("onlineLink")}
              </a>
            </MetaRow>
          ) : null}
          {event.attending > 0 || event.capacity != null ? (
            <MetaRow label={t("metaAttendance")}>
              <span className={nearlyFull ? "font-semibold" : undefined}>
                {attendanceLine(t, event)}
              </span>
            </MetaRow>
          ) : null}
        </dl>

        {!cancelToken && event.acceptingRegistrations ? (
          <button
            type="button"
            onClick={scrollToForm}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-accent-600 text-base font-semibold text-white transition-colors hover:bg-accent-700"
          >
            {t("cta")}
          </button>
        ) : null}

        {cancelToken ? (
          <CancelRegistrationPanel token={cancelToken} eventTitle={event.title} />
        ) : null}

        {event.descriptionMd ? (
          <section className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800">
            <div className="prose-text-block text-slate-800 dark:text-slate-200">
              <Markdown>{event.descriptionMd}</Markdown>
            </div>
          </section>
        ) : null}

        {!cancelToken ? (
          <RegistrationPanel
            event={event}
            onRegistered={(spotsLeft) => {
              setEvent((prev) => ({
                ...prev,
                attending: prev.attending + 1,
                spotsLeft: spotsLeft != null ? spotsLeft : prev.spotsLeft,
              }));
            }}
          />
        ) : null}

        <footer className="mt-12 flex justify-center">
          <MadeWithKurl />
        </footer>
      </main>
    </div>
  );
}

function attendanceLine(
  t: (key: string, values?: Record<string, string | number>) => string,
  event: PublicEvent,
): string {
  const parts: string[] = [];
  if (event.attending > 0) {
    parts.push(t("attending", { count: event.attending }));
  }
  if (event.capacity != null) {
    parts.push(
      event.spotsLeft != null && event.spotsLeft <= 0
        ? t("full")
        : t("spotsLeft", { count: event.spotsLeft ?? 0, capacity: event.capacity }),
    );
  }
  return parts.join(" · ");
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-slate-100 py-3 dark:border-slate-800/60">
      <dt className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-accent-700 dark:text-accent-500">
        {label}
      </dt>
      <dd className="min-w-0 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}
