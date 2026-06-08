"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  confirmTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { TwoFactorSetup, TwoFactorStatus } from "@/types";

type Mode = "loading" | "off" | "enrolling" | "on";

/**
 * TOTP enrolment / disable / recovery-code regeneration. Drops the secret + QR data on disk only
 * inside the `enrolling` step — once confirmed, the freshly generated recovery codes are shown
 * once, then the panel falls back to a status row with a "Regenerate codes" / "Disable" button
 * pair (each gated on a fresh 6-digit code).
 */
export function TwoFactorSection() {
  const t = useTranslations("settings.twofa");
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("loading");
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!setup) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(setup.provisioningUri, { width: 220, margin: 1 }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setup]);

  async function refresh() {
    try {
      const s = await getTwoFactorStatus();
      setStatus(s);
      setMode(s.enabled ? "on" : "off");
    } catch {
      setMode("off");
    }
  }

  async function handleStart() {
    setBusy(true);
    try {
      const challenge = await startTwoFactorSetup();
      setSetup(challenge);
      setMode("enrolling");
    } catch (err) {
      toast(errorMessage(err, t("startFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const result = await confirmTwoFactor(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode("");
      await refresh();
      toast(t("enrolled"), "success");
    } catch (err) {
      toast(errorMessage(err, t("confirmFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await disableTwoFactor(code.trim());
      setCode("");
      setConfirmDisable(false);
      setRecoveryCodes(null);
      await refresh();
      toast(t("disabled"), "success");
    } catch (err) {
      toast(errorMessage(err, t("disableFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    setBusy(true);
    try {
      const result = await regenerateRecoveryCodes(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setCode("");
      setConfirmRegenerate(false);
      toast(t("regenerated"), "success");
    } catch (err) {
      toast(errorMessage(err, t("regenerateFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  function handleCancelEnroll() {
    setSetup(null);
    setMode("off");
    setCode("");
  }

  if (mode === "loading") {
    return <p className="text-xs text-slate-400 dark:text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>

      {recoveryCodes && (
        <RecoveryCodesPanel codes={recoveryCodes} onDismiss={() => setRecoveryCodes(null)} />
      )}

      {mode === "off" && (
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300">
            {t("statusOff")}
          </span>
          <Button size="sm" variant="accent" onClick={handleStart} disabled={busy}>
            {busy ? t("starting") : t("enableButton")}
          </Button>
        </div>
      )}

      {mode === "enrolling" && setup && (
        <div className="space-y-3 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900">
          <p className="font-medium">{t("scanTitle")}</p>
          <p>{t("scanHint")}</p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="2FA QR"
                width={220}
                height={220}
                unoptimized
                className="rounded border border-amber-300 bg-white dark:bg-slate-900"
              />
            ) : (
              <div className="h-[220px] w-[220px] animate-pulse rounded border border-amber-200 dark:border-amber-500/30 bg-white/60" />
            )}
            <div className="flex-1 space-y-2">
              <p>{t("manualKeyHint")}</p>
              <code className="block break-all rounded bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:text-slate-100">
                {setup.secret}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t("codePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-32 font-mono"
            />
            <Button
              size="sm"
              variant="accent"
              onClick={handleConfirm}
              disabled={busy || code.length !== 6}
            >
              {busy ? t("confirming") : t("confirmButton")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEnroll} disabled={busy}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {mode === "on" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-emerald-100 dark:bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              {t("statusOn")}
            </span>
            {status?.lastUsedAt && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t("lastUsed")}: {status.lastUsedAt.replace("T", " ").slice(0, 19)}
              </span>
            )}
          </div>
          {(confirmDisable || confirmRegenerate) && (
            <div className="space-y-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {confirmDisable ? t("confirmDisableHint") : t("confirmRegenerateHint")}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t("codePlaceholder")}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-32 font-mono"
                />
                <Button
                  size="sm"
                  variant={confirmDisable ? "destructive" : "accent"}
                  onClick={confirmDisable ? handleDisable : handleRegenerate}
                  disabled={busy || code.length !== 6}
                >
                  {confirmDisable ? t("disableButton") : t("regenerateButton")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setConfirmDisable(false);
                    setConfirmRegenerate(false);
                    setCode("");
                  }}
                  disabled={busy}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
          {!confirmDisable && !confirmRegenerate && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmRegenerate(true)}>
                {t("regenerateAction")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 dark:text-red-400 hover:bg-red-50"
                onClick={() => setConfirmDisable(true)}
              >
                {t("disableAction")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecoveryCodesPanel({ codes, onDismiss }: { codes: string[]; onDismiss: () => void }) {
  const t = useTranslations("settings.twofa");
  const { toast } = useToast();

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast(t("recoveryCopied"), "success");
    } catch {
      toast(t("recoveryCopyFailed"), "error");
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900">
      <p className="font-medium">{t("recoveryTitle")}</p>
      <p>{t("recoveryHint")}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {codes.map((c) => (
          <code
            key={c}
            className="rounded bg-white dark:bg-slate-900 px-2 py-1.5 text-center font-mono text-[11px] text-slate-900 dark:text-slate-100"
          >
            {c}
          </code>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copyAll}>
          {t("recoveryCopyAll")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {t("recoveryDismiss")}
        </Button>
      </div>
    </div>
  );
}
