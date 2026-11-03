import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/modules/blog/components/markdown";
import { PublicEventPage } from "@/modules/events/components/public-event-page";
import { eventWhen, loadEvent } from "./_lib/load-event";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await loadEvent(slug);
  if (!result.ok) return { title: "kurl", robots: { index: false } };
  const event = result.event;
  const url = `${SITE_URL}/${locale}/e/${event.slug}`;
  const when = await eventWhen(event, locale);
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
      type: "website",
      siteName: "kurl",
    },
    twitter: {
      card: "summary_large_image",
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
  const result = await loadEvent(slug);
  if (!result.ok && result.status === 404) notFound();
  if (!result.ok) throw new Error(`event fetch failed: ${slug}`, { cause: result.cause });
  const event = result.event;
  return (
    <PublicEventPage
      initialEvent={event}
      when={await eventWhen(event, locale)}
      description={event.descriptionMd ? <Markdown>{event.descriptionMd}</Markdown> : null}
    />
  );
}
