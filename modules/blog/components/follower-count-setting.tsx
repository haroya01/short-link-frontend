"use client";

import { useEffect, useState } from "react";
import { EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyProfile()
      .then((p) => {
        if (alive) setHidden(p.hideFollowerCount);
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

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("settingsPrivacy")}
      </h2>
      <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm">
          <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="flex flex-col">
              {t("settingsHideFollowerCount")}
              <span className="text-[12px] text-slate-500 dark:text-slate-500">
                {t("settingsHideFollowerCountHint")}
              </span>
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={hidden}
            aria-label={t("settingsHideFollowerCount")}
            disabled={busy}
            onClick={toggle}
            className={cn(
              "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
              hidden ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-700",
            )}
          >
            <span
              className={cn(
                // left-0 anchors the knob: without it the absolutely-positioned span falls back
                // to its static position, which the button's UA text-align:center puts mid-pill.
                "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                hidden ? "translate-x-[1.375rem]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
