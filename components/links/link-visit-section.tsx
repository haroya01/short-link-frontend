"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Switch as SwitchControl } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/error-messages";
import { listMyCtas, type CtaView } from "@/lib/api/ctas";
import { getLinkDetail, setLinkVisitOptions } from "@/lib/api/links";
import type { LinkSplash } from "@/types";

const SPLASH_OFF: LinkSplash = { enabled: false, message: null, seconds: 3, ctaId: null };

const SECONDS = [1, 2, 3, 5];
const MESSAGE_MAX = 280;

export function LinkVisitSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("stats.visit");
  const { toast } = useToast();
  const toMessage = useApiErrorMessage();
  const [openInBrowser, setOpenInBrowser] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [splash, setSplash] = useState<LinkSplash>(SPLASH_OFF);
  const [draft, setDraft] = useState<LinkSplash>(SPLASH_OFF);
  const [saving, setSaving] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [ctas, setCtas] = useState<CtaView[]>([]);

  useEffect(() => {
    let active = true;
    setOpenInBrowser(null);
    setLoadFailed(false);
    getLinkDetail(shortCode)
      .then((detail) => {
        if (!active) return;
        setOpenInBrowser(Boolean(detail.openInBrowser));
        setSplash(detail.splash ?? SPLASH_OFF);
        setDraft(detail.splash ?? SPLASH_OFF);
      })
      .catch(() => active && setLoadFailed(true));
    listMyCtas()
      .then((items) => active && setCtas(items.filter((cta) => !cta.deleted)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [shortCode]);

  async function toggleOpenInBrowser() {
    if (busy || openInBrowser === null) return;
    const next = !openInBrowser;
    setBusy(true);
    setOpenInBrowser(next);
    try {
      const saved = await setLinkVisitOptions(shortCode, { openInBrowser: next });
      setOpenInBrowser(saved.openInBrowser);
    } catch (e) {
      setOpenInBrowser(!next);
      toast(toMessage(e, t("failed")), "error");
    } finally {
      setBusy(false);
    }
  }

  const splashDirty =
    draft.enabled !== splash.enabled ||
    (draft.message ?? "") !== (splash.message ?? "") ||
    draft.seconds !== splash.seconds ||
    draft.ctaId !== splash.ctaId;
  const dirty = splashDirty;

  async function saveChanges() {
    if (saving || !dirty) return;
    if (draft.enabled && !draft.message?.trim()) {
      setMessageError(true);
      return;
    }
    setSaving(true);
    try {
      const saved = await setLinkVisitOptions(shortCode, { splash: draft });
      const next = saved.splash ?? draft;
      setSplash(next);
      setDraft(next);
      toast(t("saved"), "success");
    } catch (e) {
      toast(toMessage(e, t("failed")), "error");
    } finally {
      setSaving(false);
    }
  }

  const loading = openInBrowser === null;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <h2 className="text-[15px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
        {t("title")}
      </h2>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="visit-open-in-browser" className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
            {t("openInBrowser")}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t("openInBrowserDesc")}
          </p>
        </div>
        <Switch
          checked={openInBrowser === true}
          disabled={busy || loading}
          labelledBy="visit-open-in-browser"
          onToggle={() => void toggleOpenInBrowser()}
        />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id="visit-splash" className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {t("splash")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t("splashDesc")}
            </p>
          </div>
          <Switch
            checked={draft.enabled}
            disabled={loading || saving}
            labelledBy="visit-splash"
            onToggle={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
          />
        </div>

        {draft.enabled && (
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{t("splashMessage")}</span>
              <Textarea
                value={draft.message ?? ""}
                maxLength={MESSAGE_MAX}
                rows={3}
                placeholder={t("splashMessagePlaceholder")}
                aria-invalid={messageError}
                aria-describedby="visit-splash-message-note"
                disabled={saving}
                className={`mt-1 ${messageError ? "border-red-400 focus:ring-red-400 dark:border-red-500/70" : ""}`}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, message: e.target.value }));
                  if (messageError) setMessageError(false);
                }}
              />
              <span id="visit-splash-message-note" className="mt-1 flex justify-between gap-3 text-[11px]">
                <span role={messageError ? "alert" : undefined} className="text-red-600 dark:text-red-400">
                  {messageError ? t("splashMessageRequired") : ""}
                </span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {(draft.message ?? "").length}/{MESSAGE_MAX}
                </span>
              </span>
            </label>

            <div>
              <p id="visit-splash-seconds" className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                {t("splashSeconds")}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="visit-splash-seconds"
                className="mt-1 inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
              >
                {SECONDS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={draft.seconds === n}
                    disabled={saving}
                    onClick={() => setDraft((d) => ({ ...d, seconds: n }))}
                    className={
                      "focus-ring rounded-md px-3 py-1 text-[12px] font-medium tabular-nums transition " +
                      (draft.seconds === n
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100")
                    }
                  >
                    {t("splashSecondsValue", { n })}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{t("splashCta")}</span>
              <span className="mt-1 flex flex-wrap items-center gap-3">
                <select
                  value={draft.ctaId ?? ""}
                  disabled={saving}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, ctaId: e.target.value ? Number(e.target.value) : null }))
                  }
                  className="h-9 min-w-40 rounded-md border border-slate-300 bg-white px-2 text-[13px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">{t("splashNoCta")}</option>
                  {ctas.map((cta) => (
                    <option key={cta.id} value={cta.id}>
                      {cta.label}
                    </option>
                  ))}
                </select>
                <Link href="/ctas" className="text-[12px] font-medium text-accent-700 hover:underline dark:text-accent-400">
                  {t("splashManageCtas")}
                </Link>
              </span>
            </label>
          </div>
        )}

      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {dirty && <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("unsaved")}</span>}
        <Button variant="outline" size="sm" onClick={() => void saveChanges()} disabled={!dirty || saving || loading}>
          {t("save")}
        </Button>
      </div>

      {loadFailed && (
        <p role="alert" className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {t("loadFailed")}
        </p>
      )}
    </section>
  );
}

function Switch({
  checked,
  disabled,
  labelledBy,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  labelledBy: string;
  onToggle: () => void;
}) {
  return (
    <SwitchControl
      checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={onToggle}
      className="mt-0.5"
    />
  );
}
