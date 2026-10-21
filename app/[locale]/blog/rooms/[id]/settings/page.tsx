import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoomSettings } from "@/modules/rooms/components/room-settings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return { title: `${t("settingsTitle")} · kurl log`, robots: { index: false } };
}

export default async function RoomSettingsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const roomId = Number(id);
  if (!Number.isInteger(roomId) || roomId <= 0) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-8">
      <RoomSettings roomId={roomId} />
    </div>
  );
}
