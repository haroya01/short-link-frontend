import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoomsScreen } from "@/modules/rooms/components/rooms-screen";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return { title: `${t("title")} · kurl log`, robots: { index: false } };
}

export default async function RoomsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-8">
      <RoomsScreen />
    </div>
  );
}
