import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { fetchWithTimeout } from "@/lib/api/fetch-timeout";
import type { PublicEvent } from "@/modules/events/api/events";
import { eventWhenText, type EventWhenText } from "@/modules/events/lib/format";

// 서버 컴포넌트 fetch 는 상대 URL 불가 — dev(빈 API_BASE)에선 rewrites 와 같은 BACKEND_URL 로 직접 간다.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_URL || "http://localhost:8080";

type EventResult = { ok: true; event: PublicEvent } | { ok: false; status: 404 } | { ok: false; status: "error"; cause: unknown };

export const loadEvent = cache(async (slug: string): Promise<EventResult> => {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "1") {
    const event = (await import("@/modules/events/api/_mocks")).mockPublicEvent(slug);
    return event ? { ok: true, event } : { ok: false, status: 404 };
  }
  try {
    const url = `${API_BASE}/api/v1/public/events/${encodeURIComponent(slug)}`;
    const res = await fetchWithTimeout(url, {
      // 신청 마감/잔여석은 실시간성이 중요 — 짧게만 캐시.
      next: { revalidate: 10 },
    });
    if (res.status === 404) return { ok: false, status: 404 };
    if (!res.ok) return { ok: false, status: "error", cause: `HTTP ${res.status}` };
    return { ok: true, event: (await res.json()) as PublicEvent };
  } catch (cause) {
    return { ok: false, status: "error", cause };
  }
});

export async function eventWhen(event: PublicEvent, locale: string): Promise<EventWhenText> {
  const t = await getTranslations({ locale, namespace: "events.public" });
  return eventWhenText(event, locale, { am: t("am"), pm: t("pm") });
}
