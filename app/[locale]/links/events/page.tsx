"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { CalendarPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LinksAuthGate } from "@/components/links/auth-gate";
import type { MyEvent } from "@/modules/events/api/events";
import { listMyEvents } from "@/modules/events/api/events";
import { formatEventRange } from "@/modules/events/lib/format";

export default function EventsListPage() {
  const t = useTranslations("events.list");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const [events, setEvents] = useState<MyEvent[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
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
    return (
      <LinksAuthGate
        eyebrow="events"
        title={t("authTitle")}
        description={t("authDesc")}
        next="/events"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t("title")}</h1>
        <Link
          href="/events/new"
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
        >
          <CalendarPlus className="h-4 w-4" />
          {t("new")}
        </Link>
      </div>

      {error ? (
        <p className="mt-8 text-[13px] text-red-600">{t("loadFailed")}</p>
      ) : events == null ? (
        <p className="mt-8 text-[13px] text-slate-400">{t("loading")}</p>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.status} />
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
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

function StatusBadge({ status }: { status: MyEvent["status"] }) {
  const t = useTranslations("events.status");
  if (status === "OPEN") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
        {t("open")}
      </span>
    );
  }
  if (status === "CLOSED") {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {t("closed")}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:bg-red-900/50 dark:text-red-300">
      {t("canceled")}
    </span>
  );
}

function EmptyState() {
  const t = useTranslations("events.list");
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">
        {t("emptyTitle")}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("emptyBody")}
      </p>
    </div>
  );
}
