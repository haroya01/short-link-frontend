"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import type { MyEvent } from "@/modules/events/api/events";
import { listMyEvents } from "@/modules/events/api/events";
import { formatEventRange, type EventWhenText } from "@/modules/events/lib/format";
import { ownerEventPhase } from "@/modules/events/lib/phase";
import { EventsIntro } from "@/modules/events/components/events-intro";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LinksPage } from "@/components/links/links-page";
import { cn } from "@/lib/utils";

export function EventsHome({ introWhen }: { introWhen: EventWhenText }) {
  const { ready, authenticated } = useAuth();
  const [events, setEvents] = useState<MyEvent[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setEvents(await listMyEvents());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated, load]);

  // /me 가 오기 전엔 소개와 목록 틀을 둘 다 그리고 pre-paint authHint 가 CSS 로 하나만 보인다.
  return (
    <>
      {(!ready || !authenticated) && (
        <div data-auth-slot={ready ? undefined : "anon"} className="contents">
          <EventsIntro when={introWhen} />
        </div>
      )}
      {(!ready || authenticated) && (
        <div data-auth-slot={ready ? undefined : "authed"} className="contents">
          <EventsList events={events} error={error} onRetry={() => void load()} />
        </div>
      )}
    </>
  );
}

function EventsList({
  events,
  error,
  onRetry,
}: {
  events: MyEvent[] | null;
  error: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("events.list");
  const tStatus = useTranslations("events.status");
  const tPublic = useTranslations("events.public");
  const dayPeriods = { am: tPublic("am"), pm: tPublic("pm") };
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const newEvent = (
    <Link href="/events/new" className={buttonVariants({ variant: "default" })}>
      {t("new")}
    </Link>
  );

  return (
    <LinksPage>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">{t("title")}</h1>
        {events?.length === 0 ? null : newEvent}
      </div>

      {error ? (
        <div className="mt-8">
          <ErrorState message={t("loadFailed")} onRetry={onRetry} />
        </div>
      ) : events == null ? (
        <ul aria-busy className="mt-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60">
          {[0, 1, 2].map((i) => (
            <li key={i} className="py-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <EmptyState title={t("empty")} action={newEvent} className="mt-6" />
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-slate-100 border-t border-slate-200 dark:divide-slate-800/60 dark:border-slate-800">
          {events.map((event) => {
            const phase = ownerEventPhase(event, now);
            return (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="group flex items-center gap-4 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate text-[15px] font-semibold text-slate-900 underline-offset-[3px] group-hover:underline group-hover:decoration-slate-300 dark:text-slate-100">
                        {event.title}
                      </span>
                      {phase === "open" ? null : (
                        <span
                          className={cn(
                            "shrink-0 text-xs font-medium",
                            phase === "canceled"
                              ? "text-red-700 dark:text-red-400"
                              : "text-slate-500 dark:text-slate-400",
                          )}
                        >
                          {tStatus(phase)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">
                      {formatEventRange(event.startsAt, event.endsAt, event.timezone, locale, dayPeriods)}
                      {event.locationText ? ` · ${event.locationText}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {event.capacity != null
                      ? t("signupsOf", { count: event.registrationCount, capacity: event.capacity })
                      : t("signups", { count: event.registrationCount })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LinksPage>
  );
}
