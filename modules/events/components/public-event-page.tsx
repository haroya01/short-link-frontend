"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Clock3, Globe, MapPin, UserRound, Users } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt=""
            className="mb-5 aspect-[2/1] w-full rounded-2xl border border-slate-200 object-cover dark:border-slate-800"
          />
        ) : null}

        <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          {event.title}
        </h1>

        {event.organizerName ? (
          <div className="mt-2.5 flex items-center gap-2 text-[15px] text-slate-500 dark:text-slate-400">
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

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3">
            <MetaRow icon={<CalendarDays className="h-4 w-4" />} primary={dateLine} />
            <MetaRow
              icon={<Clock3 className="h-4 w-4" />}
              primary={`${timeLine} (${timezoneLabel(event.timezone, locale)})`}
            />
            {event.locationText ? (
              <MetaRow
                icon={<MapPin className="h-4 w-4" />}
                primary={
                  event.locationUrl ? (
                    <a
                      href={event.locationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                    >
                      {event.locationText}
                    </a>
                  ) : (
                    event.locationText
                  )
                }
              />
            ) : null}
            {event.onlineUrl ? (
              <MetaRow
                icon={<Globe className="h-4 w-4" />}
                primary={
                  <a
                    href={event.onlineUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                  >
                    {t("onlineLink")}
                  </a>
                }
              />
            ) : null}
            {event.attending > 0 || event.capacity != null ? (
              <MetaRow
                icon={<Users className="h-4 w-4" />}
                primary={attendanceLine(t, event)}
                emphasize={
                  event.spotsLeft != null && event.spotsLeft > 0 && event.spotsLeft <= 3
                }
              />
            ) : null}
          </div>

          {!cancelToken && event.acceptingRegistrations ? (
            <button
              type="button"
              onClick={scrollToForm}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 text-base font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {t("cta")}
            </button>
          ) : null}
        </section>

        {cancelToken ? (
          <CancelRegistrationPanel token={cancelToken} eventTitle={event.title} />
        ) : null}

        {event.descriptionMd ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
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

        <footer className="mt-10 flex justify-center">
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

function MetaRow({
  icon,
  primary,
  emphasize = false,
}: {
  icon: React.ReactNode;
  primary: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </span>
      <span
        className={
          emphasize
            ? "text-base font-semibold leading-7 text-amber-600 dark:text-amber-400"
            : "text-base leading-7 text-slate-700 dark:text-slate-300"
        }
      >
        {primary}
      </span>
    </div>
  );
}
