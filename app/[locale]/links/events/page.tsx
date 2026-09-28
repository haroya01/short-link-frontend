"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { MyEvent } from "@/modules/events/api/events";
import { listMyEvents } from "@/modules/events/api/events";
import { formatEventRange } from "@/modules/events/lib/format";
import { EventsIntro } from "@/modules/events/components/events-intro";
import { EventStatusBadge } from "@/modules/events/components/event-status-badge";
import { ErrorState } from "@/components/common/error-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsListPage() {
  const t = useTranslations("events.list");
  const locale = useLocale();
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

  if (ready && !authenticated) {
    return <EventsIntro mode="anonymous" />;
  }

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">{t("title")}</h1>
        <Link href="/events/new" className={buttonVariants({ variant: "accent" })}>
          <CalendarPlus className="h-4 w-4" />
          {t("new")}
        </Link>
      </div>

      {error ? (
        <div className="mt-8">
          <ErrorState message={t("loadFailed")} onRetry={() => void load()} />
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
        <EventsIntro mode="empty" />
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="group flex items-center justify-between gap-4 py-4 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <EventStatusBadge status={event.status} />
                    <span className="truncate text-[15px] font-semibold text-slate-900 underline-offset-[3px] group-hover:underline group-hover:decoration-slate-300 dark:text-slate-100">
                      {event.title}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {formatEventRange(event.startsAt, event.endsAt, event.timezone, locale)}
                    {event.locationText ? ` · ${event.locationText}` : ""}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
                  <Users className="h-4 w-4 text-slate-400" />
                  {event.registrationCount}
                  {event.capacity != null ? `/${event.capacity}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
