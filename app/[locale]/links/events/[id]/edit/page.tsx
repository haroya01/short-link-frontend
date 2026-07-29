"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { LinksAuthGate } from "@/components/links/auth-gate";
import type { MyEvent } from "@/modules/events/api/events";
import { getMyEvent, updateEvent } from "@/modules/events/api/events";
import { EventForm } from "@/modules/events/components/event-form";

export default function EditEventPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const t = useTranslations("events.form");
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const [event, setEvent] = useState<MyEvent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(id)) return;
    getMyEvent(id)
      .then(setEvent)
      .catch(() => setFailed(true));
  }, [ready, authenticated, id]);

  if (ready && !authenticated) {
    return (
      <LinksAuthGate
        eyebrow="events"
        title={t("authTitle")}
        description={t("authDesc")}
        next={`/events/${idParam}/edit`}
      />
    );
  }

  if (failed) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-[13px] text-red-600">{t("errors.generic")}</p>;
  }
  if (!event) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-[13px] text-slate-400">…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t("editTitle")}</h1>
      <div className="mt-6">
        <EventForm
          event={event}
          questionsLocked={event.registrationCount > 0}
          onSubmit={async (draft) => {
            await updateEvent(event.id, draft);
            router.replace(`/events/${event.id}`);
          }}
        />
      </div>
    </div>
  );
}
