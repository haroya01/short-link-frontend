import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchRoomInviteLanding, personName } from "@/modules/rooms/api/rooms";
import { RoomJoin } from "@/modules/rooms/components/room-join";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  const landing = await fetchRoomInviteLanding(code);
  if (!landing) return { title: "kurl log", robots: { index: false } };
  const description = landing.inviter ? t("invitedBy", { name: personName(landing.inviter) }) : undefined;
  return {
    title: `${landing.roomName} · kurl log`,
    description,
    robots: { index: false },
    openGraph: { title: landing.roomName, description, siteName: "kurl log" },
  };
}

export default async function RoomJoinPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 sm:px-6">
      <RoomJoin code={code} />
    </div>
  );
}
