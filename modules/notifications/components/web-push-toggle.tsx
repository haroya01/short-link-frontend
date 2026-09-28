"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
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
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm">
          <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
        <Bell className="h-4 w-4 text-slate-400 dark:text-slate-400" />
        <span className="flex flex-col">
          {t("webPushLabel")}
          {denied && (
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              {t("webPushDenied")}
            </span>
          )}
        </span>
      </span>
      <Switch
        checked={on}
        aria-label={t("webPushLabel")}
        disabled={busy || denied}
        onClick={toggle}
      />
        </div>
      </div>
    </section>
  );
}
