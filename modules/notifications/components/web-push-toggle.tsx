"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  disableWebPush,
  enableWebPush,
  isWebPushEnabled,
  webPushSupported,
} from "@/modules/notifications/lib/web-push";

/**
 * Quiet opt-in for browser push — a settings row, never an auto-prompt (조용한 웹로그). Renders nothing
 * when the browser can't do push or no VAPID key is configured, so it's invisible until the feature is
 * actually available. Reflects the live subscription state; toggling subscribes/unsubscribes.
 */
export function WebPushToggle() {
  const t = useTranslations("notifications");
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!webPushSupported()) return;
    setSupported(true);
    setDenied(typeof Notification !== "undefined" && Notification.permission === "denied");
    isWebPushEnabled().then(setOn).catch(() => {});
  }, []);

  // Whole section is self-gating: nothing renders until push is actually available, so the settings
  // page just drops <WebPushToggle/> in and never shows a lonely empty header.
  if (!supported) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await disableWebPush();
        setOn(false);
      } else {
        const ok = await enableWebPush();
        setOn(ok);
        if (!ok && typeof Notification !== "undefined") {
          setDenied(Notification.permission === "denied");
        }
      }
    } catch {
      /* leave the toggle reflecting reality; a failed subscribe just stays off */
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("title")}</h2>
      <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm">
          <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
        <Bell className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        <span className="flex flex-col">
          {t("webPushLabel")}
          {denied && (
            <span className="text-[12px] text-slate-500 dark:text-slate-500">
              {t("webPushDenied")}
            </span>
          )}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("webPushLabel")}
        disabled={busy || denied}
        onClick={toggle}
        className={cn(
          "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          on ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-700",
        )}
      >
        <span
          className={cn(
            // left-0 anchors the knob: without it the absolutely-positioned span falls back
            // to its static position, which the button's UA text-align:center puts mid-pill.
            "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
        </div>
      </div>
    </section>
  );
}
