"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { getLinkDetail, setLinkVisitOptions } from "@/lib/api/links";

export function LinkVisitSection({ shortCode }: { shortCode: string }) {
  const t = useTranslations("stats.visit");
  const { toast } = useToast();
  const toMessage = useApiErrorMessage();
  const [openInBrowser, setOpenInBrowser] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setOpenInBrowser(null);
    setLoadFailed(false);
    getLinkDetail(shortCode)
      .then((detail) => active && setOpenInBrowser(Boolean(detail.openInBrowser)))
      .catch(() => active && setLoadFailed(true));
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
          disabled={busy || openInBrowser === null}
          labelledBy="visit-open-in-browser"
          onToggle={() => void toggleOpenInBrowser()}
        />
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={onToggle}
      className={
        "focus-ring relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 " +
        (checked ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-200 dark:bg-slate-700")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow transition " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}
