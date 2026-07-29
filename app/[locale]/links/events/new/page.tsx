"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { LinksAuthGate } from "@/components/links/auth-gate";
import { createEvent } from "@/modules/events/api/events";
import { EventForm } from "@/modules/events/components/event-form";

export default function NewEventPage() {
  const t = useTranslations("events.form");
  const router = useRouter();
  const { ready, authenticated } = useAuth();

  if (ready && !authenticated) {
    return (
      <LinksAuthGate
        eyebrow="events"
        title={t("authTitle")}
        description={t("authDesc")}
        next="/events/new"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t("newTitle")}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("newSubtitle")}</p>
      <div className="mt-6">
        <EventForm
          event={null}
          questionsLocked={false}
          onSubmit={async (draft) => {
            const created = await createEvent(draft);
            router.replace(`/events/${created.id}?created=1`);
          }}
        />
      </div>
    </div>
  );
}
