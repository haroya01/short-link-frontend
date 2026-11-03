"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { Attendee, EventAnalytics, MyEvent } from "@/modules/events/api/events";
import {
  changeEventStatus,
  getAttendees,
  getEventAnalytics,
  getMyEvent,
} from "@/modules/events/api/events";
import { formatEventRange } from "@/modules/events/lib/format";
import { shortUrlOf } from "@/lib/short-url";
import { ownerEventPhase } from "@/modules/events/lib/phase";
import { AnalyticsPanel } from "@/modules/events/components/analytics-panel";
import { AttendeeTable } from "@/modules/events/components/attendee-table";
import { CreatedLine } from "@/modules/events/components/created-line";
import { SharePanel } from "@/modules/events/components/share-panel";
import { LinksPage } from "@/components/links/links-page";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

const TEXT_LINK =
  "focus-ring rounded-sm font-medium text-slate-700 underline decoration-slate-300 decoration-1 underline-offset-[3px] transition-colors hover:decoration-slate-500 dark:text-slate-300 dark:decoration-slate-600 dark:hover:decoration-slate-400";

export default function EventDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const t = useTranslations("events.detail");
  const tList = useTranslations("events.list");
  const tStatus = useTranslations("events.status");
  const tPublic = useTranslations("events.public");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";

  const [event, setEvent] = useState<MyEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [ev, at, an] = await Promise.all([
        getMyEvent(id),
        getAttendees(id),
        getEventAnalytics(id),
      ]);
      setEvent(ev);
      setAttendees(at);
      setAnalytics(an);
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    if (ready && authenticated && Number.isFinite(id)) void load();
  }, [ready, authenticated, id, load]);

  if (ready && !authenticated) {
    return (
      <SignInEmptyState page reason="events" />
    );
  }

  if (failed) {
    return (
      <LinksPage width="form">
        <ErrorState message={t("loadFailed")} onRetry={() => void load()} />
      </LinksPage>
    );
  }
  if (!event) {
    return (
      <LinksPage width="form" aria-busy>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-3 h-4 w-72" />
        <Skeleton className="mt-10 h-40 w-full rounded-2xl" />
      </LinksPage>
    );
  }

  const publicUrl = `${SITE_URL}/${locale}/e/${event.slug}`;
  const firstLink = event.links[0]?.shortCode;
  const phase = ownerEventPhase(event, now);

  const changeStatus = async (action: "close" | "reopen" | "cancel") => {
    try {
      const updated = await changeEventStatus(event.id, action);
      setEvent(updated);
      toast(t("statusChanged"), "success");
    } catch {
      toast(t("statusChangeFailed"), "error");
    }
  };

  return (
    <LinksPage width="form">
      {justCreated && firstLink ? <CreatedLine longUrl={publicUrl} shortUrl={shortUrlOf(firstLink)} /> : null}

      <header>
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {event.title}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span
            className={cn(
              "font-medium",
              phase === "canceled"
                ? "text-red-700 dark:text-red-400"
                : phase === "open"
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-500 dark:text-slate-400",
            )}
          >
            {tStatus(phase)}
          </span>
          {" · "}
          {formatEventRange(event.startsAt, event.endsAt, event.timezone, locale, {
            am: tPublic("am"),
            pm: tPublic("pm"),
          })}
          {event.locationText ? ` · ${event.locationText}` : ""}
          {" · "}
          <span className="tabular-nums">
            {event.capacity != null
              ? tList("signupsOf", { count: event.registrationCount, capacity: event.capacity })
              : tList("signups", { count: event.registrationCount })}
          </span>
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href={publicUrl} target="_blank" rel="noreferrer" className={TEXT_LINK}>
            {t("viewPublicPage")}
          </a>
          <Link href={`/events/${event.id}/edit`} className={TEXT_LINK}>
            {t("edit")}
          </Link>
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-10">
        <SharePanel event={event} onLinksChange={() => void load()} />

        <AttendeeTable eventId={event.id} attendees={attendees} questions={event.questions} />

        {analytics ? <AnalyticsPanel analytics={analytics} /> : null}

        {event.status !== "CANCELED" ? (
          <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("manageTitle")}</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {event.status === "OPEN" ? (
                <ManageButton onClick={() => changeStatus("close")}>{t("close")}</ManageButton>
              ) : (
                <ManageButton onClick={() => changeStatus("reopen")}>{t("reopen")}</ManageButton>
              )}
              <ManageButton destructive onClick={() => setConfirmCancel(true)}>
                {t("cancelEvent")}
              </ManageButton>
            </div>
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={t("cancelDialogTitle")}
        description={t("cancelDialogBody")}
        confirmLabel={t("cancelDialogConfirm")}
        destructive
        compact
        onConfirm={async () => {
          await changeStatus("cancel");
          setConfirmCancel(false);
        }}
      />
    </LinksPage>
  );
}

function ManageButton({
  destructive = false,
  onClick,
  children,
}: {
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring -mx-1 min-h-11 rounded-md px-1 text-[15px] font-medium transition-colors",
        destructive
          ? "text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
      )}
    >
      {children}
    </button>
  );
}
