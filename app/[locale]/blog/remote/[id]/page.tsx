import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { RemoteAccountScreen } from "@/modules/notes/components/remote-account";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RemoteAccountPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const remoteId = Number(id);
  if (!Number.isInteger(remoteId) || remoteId <= 0) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:py-12">
      <RemoteAccountScreen id={remoteId} />
    </div>
  );
}
