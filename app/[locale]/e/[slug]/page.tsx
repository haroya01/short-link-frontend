import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Markdown } from "@/modules/blog/components/markdown";
import type { PublicEvent } from "@/modules/events/api/events";
import { PublicEventPage } from "@/modules/events/components/public-event-page";
import { renderContextHeaders } from "@/lib/api/render-context";
import { eventWhenText, type EventWhenText } from "@/modules/events/lib/format";

// 서버 컴포넌트 fetch 는 상대 URL 불가 — dev(빈 API_BASE)에선 rewrites 와 같은 BACKEND_URL 로 직접 간다.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_URL || "http://localhost:8080";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

async function fetchEvent(slug: string): Promise<PublicEvent | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "1") {
    return (await import("@/modules/events/api/_mocks")).mockPublicEvent(slug);
  }
  try {
    const url = `${API_BASE}/api/v1/public/events/${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      // 신청 마감/잔여석은 실시간성이 중요 — 짧게만 캐시.
      next: { revalidate: 10 },
      headers: renderContextHeaders(url),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("event fetch failed");
    return (await res.json()) as PublicEvent;
  } catch {
    return null;
  }
}

async function whenText(event: PublicEvent, locale: string): Promise<EventWhenText> {
  const t = await getTranslations({ locale, namespace: "events.public" });
  return eventWhenText(event, locale, { am: t("am"), pm: t("pm") });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) return { title: "kurl" };
  const url = `${SITE_URL}/${locale}/e/${event.slug}`;
  const when = await whenText(event, locale);
  const description = [`${when.day} ${when.time}`, event.locationText]
    .filter(Boolean)
    .join(" · ");
  return {
    title: `${event.title} · kurl`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: event.title,
      description,
      url,
      images: event.coverImageUrl
        ? [{ url: event.coverImageUrl, width: 1200, height: 630, alt: event.title }]
        : undefined,
      type: "website",
      siteName: "kurl",
    },
    twitter: {
      card: event.coverImageUrl ? "summary_large_image" : "summary",
      title: event.title,
      description,
    },
    robots: { index: false },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) notFound();
  return (
    <PublicEventPage
      initialEvent={event}
      when={await whenText(event, locale)}
      description={event.descriptionMd ? <Markdown>{event.descriptionMd}</Markdown> : null}
    />
  );
}
