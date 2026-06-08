"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { AbuseReportsManager } from "@/components/admin/abuse-reports-manager";

export default function AdminAbuseReportsPage() {
  const { ready, authenticated, isAdmin } = useAuth();
  const t = useTranslations("abuseReports");

  if (!ready) return null;
  if (!authenticated || !isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-slate-600 dark:text-slate-400">{t("noPermission")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <AbuseReportsManager />
    </main>
  );
}
