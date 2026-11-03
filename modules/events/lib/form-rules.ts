export type EventFormField = "title" | "startsAt" | "endsAt" | "capacity" | "closeAt";

type EventFormError =
  | "titleRequired"
  | "startRequired"
  | "endBeforeStart"
  | "capacityMin"
  | "closeAfterEnd"
  | "closeAfterStart";

export type EventFormErrors = Partial<Record<EventFormField, EventFormError>>;

export const FIELD_ORDER: EventFormField[] = ["title", "startsAt", "endsAt", "capacity", "closeAt"];

export function eventFormErrors(form: {
  title: string;
  startsAtLocal: string;
  endsAtLocal: string;
  capacity: string;
  closeAtLocal: string;
}): EventFormErrors {
  const errors: EventFormErrors = {};
  if (!form.title.trim()) errors.title = "titleRequired";
  if (!form.startsAtLocal) errors.startsAt = "startRequired";
  if (form.startsAtLocal && form.endsAtLocal && form.endsAtLocal < form.startsAtLocal) {
    errors.endsAt = "endBeforeStart";
  }
  if (form.capacity.trim() !== "") {
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = "capacityMin";
  }
  const lastMoment = form.endsAtLocal || form.startsAtLocal;
  if (form.closeAtLocal && lastMoment && form.closeAtLocal > lastMoment) {
    errors.closeAt = form.endsAtLocal ? "closeAfterEnd" : "closeAfterStart";
  }
  return errors;
}

export function serverFieldErrors(
  problem: { code?: string; field?: unknown; errors?: { field: string }[] },
  hasEnd: boolean,
): EventFormErrors {
  if (problem.code === "INVALID_EVENT_DETAILS") {
    if (problem.field === "endsAt") return { endsAt: "endBeforeStart" };
    if (problem.field === "closeAt") return { closeAt: hasEnd ? "closeAfterEnd" : "closeAfterStart" };
  }
  if (problem.code === "VALIDATION_FAILED" && problem.errors?.some((e) => e.field === "capacity")) {
    return { capacity: "capacityMin" };
  }
  return {};
}
