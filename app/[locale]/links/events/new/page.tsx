"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { createEvent } from "@/modules/events/api/events";
import { EventForm } from "@/modules/events/components/event-form";

export default function NewEventPage() {
  const t = useTranslations("events.form");
  const router = useRouter();
  const { ready, authenticated } = useAuth();

  if (ready && !authenticated) {
    return (
      <SignInEmptyState page reason="events" icon={CalendarDays} />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">{t("newTitle")}</h1>
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
