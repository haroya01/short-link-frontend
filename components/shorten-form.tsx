"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ApiError, isValidUrl, shortenUrl } from "@/lib/api";
import { getPowToken } from "@/lib/pow";
import type { CreateLinkResponse } from "@/types";

type Props = {
  authenticated: boolean;
  onShortened: (result: CreateLinkResponse, originalUrl: string) => void;
};

export function ShortenForm({ authenticated, onShortened }: Props) {
  const t = useTranslations("shortenForm");
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-warm proof-of-work for anonymous users so submit doesn't pay the mining cost. Authenticated
  // users skip PoW server-side, so don't bother computing.
  useEffect(() => {
    if (!authenticated) {
      getPowToken().catch(() => {});
    }
  }, [authenticated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError(t("errors.empty"));
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError(t("errors.invalid"));
      return;
    }
    setBusy(true);
    try {
      const result = await shortenUrl({
        url: trimmed,
        customCode: authenticated && customCode.trim() ? customCode.trim() : undefined,
        expiresAt: authenticated && expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onShortened(result, trimmed);
      setUrl("");
      setCustomCode("");
      setExpiresAt("");
    } catch (err) {
      setError(messageOf(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("placeholder")}
          disabled={busy}
          aria-invalid={!!error}
          className="h-12 sm:flex-1"
        />
        <Button type="submit" size="lg" variant="accent" disabled={busy} className="sm:w-32">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
        </Button>
      </div>

      {authenticated && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
            {t("advancedToggle")}
          </button>
          {showAdvanced && (
            <div className="mt-2 grid gap-2 rounded-md border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {t("customCodeLabel")}
                </span>
                <Input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  pattern="^[0-9A-Za-z]{3,16}$"
                  placeholder={t("customCodePlaceholder")}
                  className="h-9 font-mono text-sm"
                  disabled={busy}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {t("expiresAtLabel")}
                </span>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9 text-sm"
                  disabled={busy}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function messageOf(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.detail.code === "MALICIOUS_URL") return t("errors.malicious");
    if (err.detail.code === "DUPLICATE_SHORT_CODE") return t("errors.duplicate");
    if (err.detail.code === "VALIDATION_FAILED") {
      const fields = err.detail.errors?.map((e) => translateValidation(e.field, e.message, t));
      return fields?.join(", ") ?? t("errors.validation");
    }
    return err.detail.detail ?? t("errors.generic");
  }
  if (err instanceof Error) return err.message;
  return t("errors.generic");
}

function translateValidation(field: string, message: string, t: (key: string) => string): string {
  if (field === "customCode") return t("errors.customCodeFormat");
  if (field === "url") {
    if (message.toLowerCase().includes("http")) return t("errors.urlScheme");
    if (message.toLowerCase().includes("blank")) return t("errors.urlBlank");
    return t("errors.urlGeneric");
  }
  return message;
}
