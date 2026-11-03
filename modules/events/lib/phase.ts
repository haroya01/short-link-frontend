import type { MyEvent, PublicEvent, RegistrationClosedReason } from "@/modules/events/api/events";

export type EventPhase = "open" | "full" | "closed" | "ended" | "canceled";

type PhaseInput = Pick<
  PublicEvent,
  | "status"
  | "acceptingRegistrations"
  | "registrationClosedReason"
  | "startsAt"
  | "endsAt"
  | "closeAt"
  | "spotsLeft"
>;

const FROM_SERVER: Record<RegistrationClosedReason, EventPhase> = {
  CANCELED: "canceled",
  ENDED: "ended",
  CLOSED: "closed",
  DEADLINE: "closed",
  FULL: "full",
};

export function eventPhase(event: PhaseInput, now: number): EventPhase {
  if (event.registrationClosedReason !== undefined) {
    return event.registrationClosedReason === null ? "open" : FROM_SERVER[event.registrationClosedReason];
  }
  if (event.status === "CANCELED") return "canceled";
  if (now >= Date.parse(event.endsAt ?? event.startsAt)) return "ended";
  if (event.status === "CLOSED") return "closed";
  if (event.closeAt && now >= Date.parse(event.closeAt)) return "closed";
  if (event.spotsLeft != null && event.spotsLeft <= 0) return "full";
  if (!event.acceptingRegistrations) return "closed";
  return "open";
}

export function ownerEventPhase(event: MyEvent, now: number): EventPhase {
  return eventPhase(
    {
      ...event,
      acceptingRegistrations: event.status === "OPEN",
      spotsLeft: event.capacity == null ? null : event.capacity - event.registrationCount,
    },
    now,
  );
}
