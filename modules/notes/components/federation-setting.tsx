"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import {
  getFederationSettings,
  updateFederationSettings,
  type FederationSettings,
} from "@/modules/notes/api/notes";

/** Blog-settings row for note federation. Renders nothing until the setting loads so it never
 *  flashes the wrong state; flips optimistically and reconciles with the server. */
export function FederationSetting() {
  const t = useTranslations("notes");
  const [settings, setSettings] = useState<FederationSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getFederationSettings()
      .then((s) => alive && setSettings(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!settings) return null;

  async function toggle() {
    if (busy || !settings) return;
    const previous = settings;
    setSettings({ ...settings, enabled: !settings.enabled });
    setBusy(true);
    try {
      setSettings(await updateFederationSettings({ enabled: !previous.enabled }));
    } catch {
      setSettings(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("settingsTitle")}</h2>
      <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm">
          <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
            <Globe className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden />
            <span className="flex flex-col">
              {t("settingsToggle")}
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                {settings.handle
                  ? t("settingsHint", { handle: settings.handle })
                  : t("settingsHintNoHandle")}
              </span>
            </span>
          </span>
          <Switch
            checked={settings.enabled}
            aria-label={t("settingsToggle")}
            disabled={busy}
            onClick={toggle}
          />
        </div>
      </div>
    </section>
  );
}
