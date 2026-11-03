import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { marketingOg } from "@/lib/marketing-og";
import { EventsHome } from "@/modules/events/components/events-home";
import { exampleWhenText } from "@/modules/events/lib/example-when";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL ?? "https://kurl.me";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  const title = t("list.title");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}/events` },
    ...marketingOg({ locale, path: "/events", title, description }),
  };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <EventsHome introWhen={await exampleWhenText(locale)} />;
}
