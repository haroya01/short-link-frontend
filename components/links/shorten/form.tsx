"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, isValidUrl, shortenUrl } from "@/lib/api";
import { prewarmPowToken } from "@/lib/pow";
import { track } from "@/components/common/posthog-provider";
import type { CreateLinkResponse } from "@/types";

type ShortenedItem = {
  res: CreateLinkResponse;
  originalUrl: string;
};

type Props = {
  authenticated: boolean;
  onShortened: (results: ShortenedItem[]) => void;
};

export function ShortenForm({ authenticated, onShortened }: Props) {
  const t = useTranslations("shortenForm");
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-warm one proof-of-work token while the user is typing so the first POST doesn't pay the
  // mining cost. Authenticated users skip PoW server-side, so don't bother computing.
  useEffect(() => {
    if (!authenticated) {
      prewarmPowToken();
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
      const codeForSingle =
        authenticated && customCode.trim() ? customCode.trim() : undefined;
      const expiry =
        authenticated && expiresAt ? new Date(expiresAt).toISOString() : undefined;

      const res = await shortenUrl({
        url: trimmed,
        customCode: codeForSingle,
        expiresAt: expiry,
      });

      track("link_shortened", {
        count: 1,
        authenticated,
        has_custom_code: Boolean(codeForSingle),
        has_expiry: Boolean(expiry),
      });
      onShortened([{ res, originalUrl: trimmed }]);
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
        <Button
          type="submit"
          size="lg"
          variant="accent"
          disabled={busy}
          className="h-12 w-full sm:h-11 sm:w-auto sm:min-w-32"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
        </Button>
      </div>

      {/* Advanced section is auth-only — customCode + expiresAt require a logged-in account
          server-side, and anonymous visitors no longer have channel chips to expand into, so the
          toggle would reveal an empty panel. Hide it entirely for anonymous to keep the form
          surface honest about what's actually configurable. */}
      {authenticated && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            aria-controls="shorten-advanced-section"
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${showAdvanced ? "rotate-180" : ""}`}
            />
            {t("advancedToggle")}
          </button>
          {/*
           * Grid-rows trick for "auto height" reveal animations: an outer grid container animates
           * between `grid-rows-[0fr]` (collapsed) and `grid-rows-[1fr]` (expanded), and the inner
           * panel uses `min-h-0 overflow-hidden` so its measured content is clipped during transit.
           * One declarative CSS rule that survives field count changes without JS bookkeeping.
           * Reduce-motion users skip the animation entirely via the media query in the className.
           */}
          <div
            id="shorten-advanced-section"
            aria-hidden={!showAdvanced}
            className={`grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
              showAdvanced
                ? "mt-2 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
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
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
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
              </div>
            </div>
          </div>
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
