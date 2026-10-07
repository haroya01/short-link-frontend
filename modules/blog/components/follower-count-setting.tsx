"use client";

import { useEffect, useState } from "react";
import { EyeOff, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/use-confirm";
import { cn } from "@/lib/utils";
import { getMyProfile, updateMyProfile } from "@/modules/profile/api/profile";

/**
 * Blog-settings row that lets the author hide their follower/following counts everywhere. Loads the
 * current profile flag, then flips it optimistically and reconciles against the profile update — the
 * same load-then-PATCH shape as the other settings rows. The follow action itself is untouched; only
 * the numbers disappear (그래프는 유지, 점수판만 감춤 — §10 조용함). Renders nothing until the flag loads
 * so it never flashes the wrong state.
 */
export function FollowerCountSetting() {
  const t = useTranslations("blogWorkspace");
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    let alive = true;
    getMyProfile()
      .then((p) => {
        if (!alive) return;
        setHidden(p.hideFollowerCount);
        setLocked(p.locked ?? false);
      })
      .catch(() => alive && setHidden(false));
    return () => {
      alive = false;
    };
  }, []);

  if (hidden === null) return null;

  async function toggle() {
    if (busy) return;
    const next = !hidden;
    setHidden(next); // optimistic
    setBusy(true);
    try {
      const p = await updateMyProfile({ hideFollowerCount: next });
      setHidden(p.hideFollowerCount);
    } catch {
      setHidden(!next); // roll back
    } finally {
      setBusy(false);
    }
  }

  // Unlocking lets everyone still waiting in (Mastodon does the same), so it asks first.
  async function toggleLock() {
    if (busy) return;
    const next = !locked;
    if (!next && !(await confirm({ title: t("settingsUnlockTitle"), description: t("settingsUnlockBody"), confirmLabel: t("settingsUnlockConfirm") })))
      return;
    setLocked(next);
    setBusy(true);
    try {
      const p = await updateMyProfile({ locked: next });
      setLocked(p.locked ?? next);
    } catch {
      setLocked(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("settingsPrivacy")}
      </h2>
      <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm">
          <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-400" />
            <span className="flex flex-col">
              {t("settingsHideFollowerCount")}
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {t("settingsHideFollowerCountHint")}
              </span>
            </span>
          </span>
          <Switch
            checked={hidden}
            aria-label={t("settingsHideFollowerCount")}
            disabled={busy}
            onClick={toggle}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm">
          <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <Lock className="h-4 w-4 text-slate-400 dark:text-slate-400" />
            <span className="flex flex-col">
              {t("settingsLocked")}
              <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("settingsLockedHint")}</span>
            </span>
          </span>
          <Switch
            checked={locked}
            aria-label={t("settingsLocked")}
            data-testid="locked-switch"
            disabled={busy}
            onClick={toggleLock}
          />
        </div>
      </div>
      {confirmDialog}
    </section>
  );
}
