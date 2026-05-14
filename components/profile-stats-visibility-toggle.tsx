"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getProfileStatsVisibility, setProfileStatsVisibility } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { useToast } from "@/components/ui/toast";

/**
 * Per-owner switch: "let visitors see your visit stats at /u/{username}/stats".
 * Default off. Renders nothing until the username is claimed — there's no public stats URL
 * to expose without one. Sits below {@link ProfileVisitSummaryCard} so the visibility decision
 * is anchored next to the numbers it'd expose.
 */
export function ProfileStatsVisibilityToggle({ hasUsername }: { hasUsername: boolean }) {
  const t = useTranslations("settings.profile.stats.visibility");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasUsername) return;
    getProfileStatsVisibility()
      .then((r) => setIsPublic(r.isPublic))
      .catch(() => setIsPublic(null));
  }, [hasUsername]);

  if (!hasUsername || isPublic === null) return null;

  async function toggle() {
    const next = !isPublic;
    setSaving(true);
    try {
      const r = await setProfileStatsVisibility(next);
      setIsPublic(r.isPublic);
      toast(r.isPublic ? t("savedPublic") : t("savedPrivate"), "success");
    } catch (err) {
      toast(errorMessage(err, t("saveFailed")), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {isPublic ? (
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        )}
        <div>
          <p className="text-sm font-medium text-slate-900">{t("title")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {isPublic ? t("publicHint") : t("privateHint")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={isPublic}
        className={
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition disabled:opacity-50 " +
          (isPublic ? "bg-emerald-600" : "bg-slate-300")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 rounded-full bg-white shadow transition " +
            (isPublic ? "translate-x-5" : "translate-x-0.5")
          }
        />
        {saving && (
          <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
        )}
      </button>
    </div>
  );
}
