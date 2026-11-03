import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewEventScreen } from "@/modules/events/components/new-event-screen";
import { exampleWhenText } from "@/modules/events/lib/example-when";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events.form" });
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function NewEventPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <NewEventScreen introWhen={await exampleWhenText(locale)} />;
}
