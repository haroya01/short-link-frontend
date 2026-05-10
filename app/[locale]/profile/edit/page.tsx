"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ProfileSection } from "@/components/profile-section";

export default function ProfileEditPage() {
  const t = useTranslations("settings.profile");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready } = useAuth();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [ready, authenticated, locale, router]);

  if (!ready || !authenticated) {
    return <div className="container max-w-2xl py-16 text-sm text-slate-500">…</div>;
  }

  return (
    <div className="container max-w-2xl space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("intro")}</p>
      </div>
      <ProfileSection />
    </div>
  );
}
