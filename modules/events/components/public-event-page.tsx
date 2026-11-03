"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicEvent } from "@/modules/events/api/events";
import { CancelRegistrationPanel } from "./cancel-registration-panel";
import { EventPageView } from "./event-page-view";

export function PublicEventPage({
  initialEvent,
  description,
}: {
  initialEvent: PublicEvent;
  description?: ReactNode;
}) {
  const cancelToken = useSearchParams().get("cancel");
  const [event, setEvent] = useState(initialEvent);
  const [now] = useState(() => Date.now());

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <main className="mx-auto w-full max-w-[42rem] px-5 pb-12 pt-8 sm:pt-12">
        <EventPageView
          event={event}
          now={now}
          description={description}
          registration={
            cancelToken ? <CancelRegistrationPanel token={cancelToken} eventTitle={event.title} /> : undefined
          }
          onRegistered={(spotsLeft) =>
            setEvent((prev) => ({
              ...prev,
              attending: prev.attending + 1,
              spotsLeft: spotsLeft != null ? spotsLeft : prev.spotsLeft,
            }))
          }
        />
      </main>
    </div>
  );
}
