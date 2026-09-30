"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import type { PublicEvent } from "@/modules/events/api/events";
import {
  formatEventDate,
  formatEventRange,
  formatEventTime,
  timezoneLabel,
} from "@/modules/events/lib/format";

export type EventHeadData = Pick<
  PublicEvent,
  | "coverImageUrl"
  | "title"
  | "organizerName"
  | "organizerAvatarUrl"
  | "startsAt"
  | "endsAt"
  | "timezone"
  | "locationText"
  | "locationUrl"
  | "onlineUrl"
  | "attending"
  | "capacity"
  | "spotsLeft"
>;

/**
 * The top of the invitation participants open — cover, title, host, and the date / time / place /
 * attendance lines. The public event page and the events landing draw the same head.
 */
export function EventHead({ event, heading = "h1" }: { event: EventHeadData; heading?: "h1" | "h3" }) {
  const t = useTranslations("events.public");
  const locale = useLocale();
  const Heading = heading;
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

  const nearlyFull = event.spotsLeft != null && event.spotsLeft > 0 && event.spotsLeft <= 3;

  return (
    <>
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt=""
          className="mb-7 aspect-[2/1] w-full rounded-2xl object-cover"
        />
      ) : null}

      <Heading className="text-[28px] font-bold leading-[1.25] tracking-tight text-slate-900 dark:text-slate-50 sm:text-[32px]">
        {event.title}
      </Heading>

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
          <span className="text-slate-500 dark:text-slate-400">
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
    </>
  );
}

function attendanceLine(
  t: (key: string, values?: Record<string, string | number>) => string,
  event: EventHeadData,
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
      <dt className="w-14 shrink-0 text-[13px] font-semibold text-accent-700 dark:text-accent-400">
        {label}
      </dt>
      <dd className="min-w-0 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}
