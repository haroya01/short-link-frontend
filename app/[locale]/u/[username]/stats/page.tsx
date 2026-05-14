"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, getPublicProfileStats } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { useToast } from "@/components/ui/toast";
import { ProfileStatsDashboard } from "@/components/profile-stats-dashboard";
import type { ProfileStats } from "@/types";

/**
 * Public visit stats for a profile owner who opted into public visibility. Mirrors short-link's
 * {@code /stats/[code]/public} pattern. Returns the same chart dashboard the owner sees, minus
 * any owner-controls — visitors can't toggle visibility or navigate back to the editor.
 *
 * If the owner hasn't opted in (or the username doesn't exist), the BE returns 404; we collapse
 * both into a single "이 프로필은 통계를 공개하지 않았습니다" message so opted-out users aren't
 * outed by error-message specificity.
 */
export default function PublicProfileStatsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const t = useTranslations("settings.profile.stats");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [data, setData] = useState<ProfileStats | null>(null);
  const [notPublic, setNotPublic] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getPublicProfileStats(username));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotPublic(true);
      } else {
        toast(errorMessage(err, t("loadFailed")), "error");
      }
    } finally {
      setLoading(false);
    }
  }, [username, errorMessage, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notPublic || !data) {
    return (
      <div className="container max-w-3xl space-y-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("publicNotAvailable.title")}</h1>
        <p className="text-sm text-slate-500">{t("publicNotAvailable.body")}</p>
        <Link
          href={`/${locale}/u/${username}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />@{username}
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      <div>
        <Link
          href={`/${locale}/u/${username}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />@{username}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {t("publicTitle", { username })}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("publicIntro")}</p>
      </div>

      <ProfileStatsDashboard data={data} />
    </div>
  );
}
