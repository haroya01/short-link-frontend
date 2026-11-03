"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { isHttpUrl } from "@/lib/extract-url";
import type { PublicEvent } from "@/modules/events/api/events";
import { formatEventWhen, timezoneLabel } from "@/modules/events/lib/format";
import { placeIdFromUrl } from "@/modules/events/lib/place";
import { eventPhase } from "@/modules/events/lib/phase";
import { RegistrationPanel } from "./registration-panel";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const LINK =
  "underline decoration-slate-300 underline-offset-[3px] transition-colors hover:decoration-slate-500 dark:decoration-slate-600 dark:hover:decoration-slate-400";

export function EventPageView({
  event,
  now,
  description,
  heading = "h1",
  preview = false,
  registration,
  onRegistered,
}: {
  event: PublicEvent;
  now: number;
  description?: ReactNode;
  heading?: "h1" | "h2";
  preview?: boolean;
  registration?: ReactNode;
  onRegistered?: (spotsLeft: number | null) => void;
}) {
  const t = useTranslations("events.public");
  const locale = useLocale();
  const Heading = heading;
  const when = Number.isNaN(Date.parse(event.startsAt))
    ? null
    : formatEventWhen(event.startsAt, event.endsAt, event.timezone, locale);
  const placeId = MAPS_KEY && event.locationUrl ? placeIdFromUrl(event.locationUrl) : null;

  return (
    <article>
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.coverImageUrl} alt="" className="mb-7 aspect-[2/1] w-full rounded-2xl object-cover" />
      ) : null}

      <Heading className="text-balance break-keep text-[28px] font-bold leading-[1.25] tracking-headline text-slate-900 dark:text-slate-50 sm:text-[32px]">
        {event.title}
      </Heading>

      {event.organizerName ? (
        <p className="mt-3 flex items-center gap-2 text-[14px] text-slate-500 dark:text-slate-400">
          {event.organizerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.organizerAvatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : null}
          <span>
            {t("hostedBy")}{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">{event.organizerName}</span>
          </span>
        </p>
      ) : null}

      <dl className="mt-7 border-t border-slate-200 dark:border-slate-800">
        <Fact label={t("metaWhen")}>
          {when ? (
            <>
              {/* Intl 결과가 서버(Node)와 브라우저의 ICU 에 따라 다르다(CI Node 의 ko 시각이 "PM 7:00"). */}
              <span className="block" suppressHydrationWarning>
                {when.day}
              </span>
              <span className="block" suppressHydrationWarning>
                {when.time}{" "}
                <span className="text-slate-500 dark:text-slate-400" suppressHydrationWarning>
                  ({timezoneLabel(event.timezone, locale)})
                </span>
              </span>
            </>
          ) : (
            "—"
          )}
        </Fact>
        {event.locationText ? (
          <Fact label={t("metaPlace")}>
            {event.locationUrl && isHttpUrl(event.locationUrl) ? (
              <a href={event.locationUrl} target="_blank" rel="noreferrer" className={LINK}>
                {event.locationText}
              </a>
            ) : (
              event.locationText
            )}
          </Fact>
        ) : null}
        {event.onlineUrl && isHttpUrl(event.onlineUrl) ? (
          <Fact label={t("metaOnline")}>
            <a href={event.onlineUrl} target="_blank" rel="noreferrer" className={LINK}>
              {t("onlineLink")}
            </a>
          </Fact>
        ) : null}
        {event.attending > 0 || event.capacity != null ? (
          <Fact label={t("metaAttendance")}>{attendanceLine(t, event)}</Fact>
        ) : null}
      </dl>

      {registration ?? (
        <RegistrationPanel
          event={event}
          phase={eventPhase(event, now)}
          preview={preview}
          onRegistered={onRegistered}
        />
      )}

      {description ? (
        <section className="mt-10 border-t border-slate-200 pt-7 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("aboutTitle")}</h2>
          <div className="prose-text-block prose-event mt-3 text-slate-800 dark:text-slate-200">{description}</div>
        </section>
      ) : null}

      {placeId ? (
        <iframe
          title={event.locationText ?? t("metaPlace")}
          className="mt-10 aspect-[2/1] w-full rounded-2xl border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=place_id:${placeId}&language=${locale}`}
        />
      ) : null}

      <footer className="mt-14 flex justify-center">
        <MadeWithKurl plain />
      </footer>
    </article>
  );
}

function attendanceLine(
  t: (key: string, values?: Record<string, string | number>) => string,
  event: Pick<PublicEvent, "attending" | "capacity" | "spotsLeft">,
): string {
  const parts: string[] = [];
  if (event.attending > 0) parts.push(t("attending", { count: event.attending }));
  if (event.capacity != null) {
    parts.push(t("spotsLeft", { count: Math.max(0, event.spotsLeft ?? 0), capacity: event.capacity }));
  }
  return parts.join(" · ");
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-slate-100 py-3 dark:border-slate-800/60">
      <dt className="w-16 shrink-0 text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}
