import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PublicEvent } from "@/modules/events/api/events";
import { PublicEventPage } from "@/modules/events/components/public-event-page";

// 서버 컴포넌트 fetch 는 상대 URL 불가 — dev(빈 API_BASE)에선 rewrites 와 같은 BACKEND_URL 로 직접 간다.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || process.env.BACKEND_URL || "http://localhost:8080";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

async function fetchEvent(slug: string): Promise<PublicEvent | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/events/${encodeURIComponent(slug)}`, {
      // 신청 마감/잔여석은 실시간성이 중요 — 짧게만 캐시.
      next: { revalidate: 10 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("event fetch failed");
    return (await res.json()) as PublicEvent;
  } catch {
    return null;
  }
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
  const description = [
    new Intl.DateTimeFormat(locale, {
      timeZone: event.timezone,
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(event.startsAt)),
    event.locationText,
  ]
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
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) notFound();
  return <PublicEventPage initialEvent={event} />;
}
