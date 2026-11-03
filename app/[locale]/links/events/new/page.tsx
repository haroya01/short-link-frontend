"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { createEvent } from "@/modules/events/api/events";
import { EventForm } from "@/modules/events/components/event-form";
import { EventsIntro } from "@/modules/events/components/events-intro";
import { LinksPage } from "@/components/links/links-page";

export default function NewEventPage() {
  const t = useTranslations("events.form");
  const router = useRouter();
  const { ready, authenticated } = useAuth();

  return (
    <>
      {(!ready || !authenticated) && (
        <div data-auth-slot={ready ? undefined : "anon"} className="contents">
          <EventsIntro />
        </div>
      )}
      {(!ready || authenticated) && (
        <div data-auth-slot={ready ? undefined : "authed"} className="contents">
          <LinksPage>
            <EventForm
              event={null}
              questionsLocked={false}
              title={t("newTitle")}
              subtitle={t("newSubtitle")}
              onSubmit={async (draft) => {
                const created = await createEvent(draft);
                router.replace(`/events/${created.id}?created=1`);
              }}
            />
          </LinksPage>
        </div>
      )}
    </>
  );
}
