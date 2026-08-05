import { request, requestBlob } from "@/lib/api/client";
import { getPowToken } from "@/lib/pow";

export type EventQuestion = {
  id: number;
  type: "SHORT_TEXT" | "SINGLE_CHOICE";
  label: string;
  options: string[];
  required: boolean;
};

export type QuestionSpec = {
  type: "SHORT_TEXT" | "SINGLE_CHOICE";
  label: string;
  options?: string[];
  required: boolean;
};

export type ContactField = "EMAIL" | "PHONE" | "KAKAO" | "LINE" | "INSTAGRAM";

export type PublicEvent = {
  slug: string;
  title: string;
  descriptionMd: string | null;
  coverImageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  locationText: string | null;
  locationUrl: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  spotsLeft: number | null;
  closeAt: string | null;
  contactField: ContactField;
  status: "OPEN" | "CLOSED" | "CANCELED";
  acceptingRegistrations: boolean;
  attending: number;
  organizerName: string | null;
  organizerAvatarUrl: string | null;
  questions: EventQuestion[];
};

export type EventLink = {
  linkId: number;
  shortCode: string | null;
  label: string;
};

export type MyEvent = {
  id: number;
  slug: string;
  title: string;
  descriptionMd: string | null;
  coverImageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  locationText: string | null;
  locationUrl: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  closeAt: string | null;
  contactField: ContactField;
  status: "OPEN" | "CLOSED" | "CANCELED";
  registrationCount: number;
  questions: EventQuestion[];
  links: EventLink[];
  createdAt: string;
};

export type Attendee = {
  id: number;
  name: string;
  contact: string;
  answers: Record<string, string>;
  status: "CONFIRMED" | "CANCELED";
  channel: string | null;
  createdAt: string;
  canceledAt: string | null;
};

export type AnalyticsBucket = { key: string; count: number };
export type DailyBucket = { date: string; count: number };

export type EventAnalytics = {
  totalClicks: number;
  totalRegistrations: number;
  clicksByLink: AnalyticsBucket[];
  clicksByClientApp: AnalyticsBucket[];
  registrationsByChannel: AnalyticsBucket[];
  dailyRegistrations: DailyBucket[];
};

export type RegistrationResult = {
  registrationId: number;
  cancelToken: string;
  spotsLeft: number | null;
};

export type EventDraft = {
  title: string;
  descriptionMd: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  locationText: string | null;
  locationUrl: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  closeAt: string | null;
  contactField?: ContactField;
  questions: QuestionSpec[];
};

export function listMyEvents(): Promise<MyEvent[]> {
  return request<MyEvent[]>("/api/v1/events");
}

export function getMyEvent(id: number): Promise<MyEvent> {
  return request<MyEvent>(`/api/v1/events/${id}`);
}

export function createEvent(draft: EventDraft): Promise<MyEvent> {
  return request<MyEvent>("/api/v1/events", { method: "POST", body: draft });
}

export function updateEvent(id: number, draft: EventDraft): Promise<MyEvent> {
  return request<MyEvent>(`/api/v1/events/${id}`, { method: "PATCH", body: draft });
}

export function changeEventStatus(
  id: number,
  action: "close" | "reopen" | "cancel",
): Promise<MyEvent> {
  return request<MyEvent>(`/api/v1/events/${id}/status`, { method: "POST", body: { action } });
}

export function createAliasLink(
  id: number,
  label: string,
): Promise<{ linkId: number; shortCode: string }> {
  return request(`/api/v1/events/${id}/links`, { method: "POST", body: { label } });
}

export function getAttendees(id: number): Promise<Attendee[]> {
  return request<Attendee[]>(`/api/v1/events/${id}/attendees`);
}

export function downloadAttendeesCsv(id: number) {
  return requestBlob(`/api/v1/events/${id}/attendees.csv`);
}

export function getEventAnalytics(id: number): Promise<EventAnalytics> {
  return request<EventAnalytics>(`/api/v1/events/${id}/analytics`);
}

export function presignCover(
  id: number,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string; key: string; maxBytes: number }> {
  return request(`/api/v1/events/${id}/cover/presign`, {
    method: "POST",
    body: { contentType },
  });
}

export function commitCover(id: number, key: string): Promise<{ coverImageUrl: string }> {
  return request(`/api/v1/events/${id}/cover/commit`, { method: "POST", body: { key } });
}

export function getPublicEvent(slug: string): Promise<PublicEvent> {
  return request<PublicEvent>(`/api/v1/public/events/${encodeURIComponent(slug)}`);
}

export async function registerForEvent(
  slug: string,
  body: { name: string; contact: string; answers: Record<number, string> },
): Promise<RegistrationResult> {
  const pow = await getPowToken();
  const headers: Record<string, string> = {};
  if (pow) {
    headers["X-Pow-Challenge"] = pow.challenge;
    headers["X-Pow-Nonce"] = pow.nonce;
  }
  return request<RegistrationResult>(
    `/api/v1/public/events/${encodeURIComponent(slug)}/registrations`,
    { method: "POST", body, headers },
  );
}

export function cancelRegistration(token: string): Promise<void> {
  return request<void>("/api/v1/public/events/registrations/cancel", {
    method: "POST",
    body: { token },
  });
}
