"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { getProfileStats } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { useToast } from "@/components/ui/toast";
import { ProfileStatsDashboard } from "@/components/profile-stats-dashboard";
import type { ProfileStats } from "@/types";

/**
 * Owner's profile visit stats — chart dashboard fed from {@code GET /api/v1/users/me/profile/stats}.
 * The visual breakdown is now inside {@link ProfileStatsDashboard} so the same view also powers
 * the anonymous {@code /u/<username>/stats} public page when the owner opts in.
 */
export default function ProfileStatsPage() {
  const t = useTranslations("settings.profile.stats");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [data, setData] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) router.replace(`/${locale}/login`);
  }, [ready, authenticated, locale, router]);

  // Fetch once when the user becomes authenticated. errorMessage/t/toast are intentionally
  // omitted from deps — they get re-created on every render (next-intl t, useToast, etc.), and
  // having them in deps spun an infinite fetch loop here. Re-running on locale or toast identity
  // change would re-fetch unnecessarily anyway.
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    setLoading(true);
    getProfileStats()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) toast(errorMessage(err, t("loadFailed")), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  if (!ready || !authenticated) {
    return <div className="container max-w-3xl py-16 text-sm text-slate-500">…</div>;
  }
  if (loading || !data) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      <div>
        <Link
          href={`/${locale}/profile/edit`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToEditor")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("intro")}</p>
      </div>

      <ProfileStatsDashboard data={data} />
    </div>
  );
}
