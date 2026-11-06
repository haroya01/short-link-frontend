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
import { GROUPED_CELL, GroupedList } from "@/components/common/grouped-list";
import { ActionRow, BlockRow, ErrorRow, NoteRow } from "@/components/settings/settings-rows";
import { formatDate } from "@/lib/utils";
import type { TwoFactorSetup, TwoFactorStatus } from "@/types";

type Mode = "loading" | "off" | "enrolling" | "on" | "error";

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
      // 로드 실패를 "꺼짐"으로 위장하지 않는다 — 켜둔 사용자가 설정이 풀린 것으로 오인하는 것을 막는다.
      setMode("error");
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

  const codeInput = (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      maxLength={6}
      aria-label={t("codeLabel")}
      placeholder={t("codePlaceholder")}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
      className="w-32 font-mono"
    />
  );

  return (
    <GroupedList title={t("title")} footer={t("description")}>
      {mode === "loading" && <NoteRow>{t("loading")}</NoteRow>}

      {mode === "error" && (
        <ErrorRow
          message={t("loadError")}
          retryLabel={t("retry")}
          onRetry={() => {
            setMode("loading");
            void refresh();
          }}
        />
      )}

      {recoveryCodes && (
        <BlockRow>
          <RecoveryCodesPanel codes={recoveryCodes} onDismiss={() => setRecoveryCodes(null)} />
        </BlockRow>
      )}

      {mode === "off" && (
        <div className={GROUPED_CELL}>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("statusOff")}</span>
          <Button size="sm" onClick={handleStart} disabled={busy}>
            {busy ? t("starting") : t("enableButton")}
          </Button>
        </div>
      )}

      {mode === "enrolling" && setup && (
        <BlockRow>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("scanTitle")}</p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt="2FA QR"
                data-sentry-block
                width={220}
                height={220}
                unoptimized
                className="rounded-md border border-slate-200 bg-white dark:border-slate-700"
              />
            ) : (
              <div className="h-[220px] w-[220px] animate-pulse rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("manualKeyHint")}</p>
              <code data-sentry-mask className="block break-all rounded-md bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                {setup.secret}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {codeInput}
            <Button size="sm" onClick={handleConfirm} disabled={busy || code.length !== 6}>
              {busy ? t("confirming") : t("confirmButton")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEnroll} disabled={busy}>
              {t("cancel")}
            </Button>
          </div>
        </BlockRow>
      )}

      {mode === "on" && (
        <>
          <div className={GROUPED_CELL}>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("statusOn")}</span>
            {status?.lastUsedAt && (
              <span className="min-w-0 truncate text-sm tabular-nums text-slate-500 dark:text-slate-400">
                {t("lastUsed")} {formatDate(status.lastUsedAt)}
              </span>
            )}
          </div>
          {confirmDisable || confirmRegenerate ? (
            <BlockRow>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {confirmDisable ? t("confirmDisableHint") : t("confirmRegenerateHint")}
              </p>
              <div className="flex items-center gap-2">
                {codeInput}
                <Button
                  size="sm"
                  variant={confirmDisable ? "destructive" : "default"}
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
            </BlockRow>
          ) : (
            <>
              <ActionRow onClick={() => setConfirmRegenerate(true)}>{t("regenerateAction")}</ActionRow>
              <ActionRow danger onClick={() => setConfirmDisable(true)}>
                {t("disableAction")}
              </ActionRow>
            </>
          )}
        </>
      )}
    </GroupedList>
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
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <p className="font-medium">{t("recoveryTitle")}</p>
      <p>{t("recoveryHint")}</p>
      <div data-sentry-mask className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
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
