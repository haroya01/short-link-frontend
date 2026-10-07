"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { getMyProfile, updateMyProfile } from "@/modules/profile/api/profile";

const MAX = 30;

export function DisplayNameSetting() {
  const t = useTranslations("blogWorkspace");
  const { toast } = useToast();
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyProfile()
      .then((profile) => {
        if (!alive) return;
        setSaved(profile.displayName ?? "");
        setDraft(profile.displayName ?? "");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (saved === null) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const profile = await updateMyProfile({ displayName: draft.trim() });
      setSaved(profile.displayName ?? "");
      setDraft(profile.displayName ?? "");
      toast(t("displayNameSaved"));
    } catch {
      toast(t("displayNameFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("displayNameTitle")}</h2>
      <form onSubmit={save} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 px-1">
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            placeholder={t("displayNamePlaceholder")}
            aria-label={t("displayNameTitle")}
            className="focus-ring min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={busy || draft.trim() === saved}
            className="focus-ring shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            {t("displayNameSave")}
          </button>
        </div>
        <p className="mt-2 px-1 text-[12px] text-slate-500 dark:text-slate-400">{t("displayNameHint")}</p>
      </form>
    </section>
  );
}
