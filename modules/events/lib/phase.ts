import type { PublicEvent } from "@/modules/events/api/events";

export type EventPhase = "open" | "full" | "closed" | "ended" | "canceled";

type PhaseInput = Pick<
  PublicEvent,
  "status" | "acceptingRegistrations" | "startsAt" | "endsAt" | "closeAt" | "spotsLeft"
>;

function eventEndsAt(event: Pick<PublicEvent, "startsAt" | "endsAt">): number {
  const start = Date.parse(event.startsAt);
  const end = event.endsAt ? Date.parse(event.endsAt) : start;
  return Math.max(start, end);
}

export function eventPhase(event: PhaseInput, now: number): EventPhase {
  if (event.status === "CANCELED") return "canceled";
  if (now >= eventEndsAt(event)) return "ended";
  if (event.status === "CLOSED") return "closed";
  if (event.closeAt && now >= Date.parse(event.closeAt)) return "closed";
  if (event.spotsLeft != null && event.spotsLeft <= 0) return "full";
  if (!event.acceptingRegistrations) return "closed";
  return "open";
}
