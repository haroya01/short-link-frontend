"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ExternalLink, PartyPopper, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LinksAuthGate } from "@/components/links/auth-gate";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Attendee, EventAnalytics, MyEvent } from "@/modules/events/api/events";
import {
  changeEventStatus,
  getAttendees,
  getEventAnalytics,
  getMyEvent,
} from "@/modules/events/api/events";
import { formatEventRange } from "@/modules/events/lib/format";
import { AnalyticsPanel } from "@/modules/events/components/analytics-panel";
import { AttendeeTable } from "@/modules/events/components/attendee-table";
import { SharePanel } from "@/modules/events/components/share-panel";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = use(params);
  const id = Number(idParam);
  const t = useTranslations("events.detail");
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

  const load = useCallback(async () => {
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
      <LinksAuthGate
        eyebrow="events"
        title={t("authTitle")}
        description={t("authDesc")}
        next={`/events/${idParam}`}
      />
    );
  }

  if (failed) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-[13px] text-red-600">{t("loadFailed")}</p>;
  }
  if (!event) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-[13px] text-slate-400">{t("loading")}</p>;
  }

  const publicUrl = `${SITE_URL}/${locale}/e/${event.slug}`;

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      {justCreated ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <PartyPopper className="h-4 w-4 shrink-0" />
          {t("createdBanner")}
        </div>
      ) : null}

      <header>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-tight text-slate-900 dark:text-slate-50">
            {event.title}
          </h1>
          <Link
            href={`/events/${event.id}/edit`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("edit")}
          </Link>
        </div>
        <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
          {formatEventRange(event.startsAt, event.endsAt, event.timezone, locale)}
          {event.locationText ? ` · ${event.locationText}` : ""}
        </p>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500 dark:text-slate-300"
        >
          {t("viewPublicPage")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <SharePanel event={event} onLinksChange={() => void load()} />

      {analytics ? <AnalyticsPanel analytics={analytics} /> : null}

      <AttendeeTable eventId={event.id} attendees={attendees} questions={event.questions} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
          {t("manageTitle")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {event.status === "OPEN" ? (
            <ManageButton onClick={() => changeStatus("close")}>{t("close")}</ManageButton>
          ) : null}
          {event.status === "CLOSED" ? (
            <ManageButton onClick={() => changeStatus("reopen")}>{t("reopen")}</ManageButton>
          ) : null}
          {event.status !== "CANCELED" ? (
            <ManageButton destructive onClick={() => setConfirmCancel(true)}>
              {t("cancelEvent")}
            </ManageButton>
          ) : (
            <p className="text-[12px] text-red-500">{t("canceledNote")}</p>
          )}
        </div>
      </section>

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
    </div>
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
      className={
        destructive
          ? "rounded-lg border border-red-300 px-3.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
          : "rounded-lg border border-slate-300 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
      }
    >
      {children}
    </button>
  );
}
