"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { mintAdminAccessToken } from "@/lib/api";
import { Section } from "@/components/common/section";

/**
 * Admin-only panel that mints a fresh access token for the calling admin and shows it once with a
 * copy button — a convenience for scripting against the API (seeding, one-off automation) without
 * digging the token out of devtools localStorage.
 */
export function AdminAccessToken() {
  const t = useTranslations("admin.accessToken");
  const [token, setToken] = useState<string | null>(null);
  const [expiresMin, setExpiresMin] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await mintAdminAccessToken();
      setToken(res.accessToken);
      setExpiresMin(Math.round(res.expiresInSeconds / 60));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <Section title={t("title")} description={t("desc")}>
      <div className="space-y-3">
        {token && (
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={token}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 font-mono text-[12px] text-slate-700 dark:text-slate-300"
            />
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-3 text-[13px] font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {copied ? <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" /> : <Copy className="h-4 w-4" />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={issue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {token ? t("reissue") : t("issue")}
          </button>
          {token && (
            <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("expires", { minutes: expiresMin })}</span>
          )}
          {!token && <span className="text-[12px] text-slate-400 dark:text-slate-500">{t("hint")}</span>}
        </div>

        {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Section>
  );
}
