"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import { CountryCombobox } from "@/components/links/country-combobox";
import { useConfirm } from "@/components/ui/use-confirm";
import { countryName } from "@/lib/utils";
import {
  MAX_BLOCKED_COUNTRIES,
  POST_AUDIENCES,
  type PasswordProblem,
  type PostAudience,
} from "@/modules/blog/lib/post-audience";

const OPTION_EDGES = [
  "",
  "border-l",
  "border-t sm:border-l sm:border-t-0",
  "border-l border-t sm:border-t-0",
] as const;

export function AudienceSection({
  status,
  audience,
  onAudienceChange,
  password,
  onPasswordChange,
  hasPassword,
  passwordIssue,
  showPasswordIssue,
  unlistedUrl,
  onRotate,
  blockedCountries,
  onBlockedCountriesChange,
}: {
  status: PostStatus;
  audience: PostAudience;
  onAudienceChange: (v: PostAudience) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  hasPassword: boolean;
  passwordIssue: PasswordProblem | null;
  showPasswordIssue: boolean;
  unlistedUrl: string | null;
  onRotate: () => Promise<boolean>;
  blockedCountries: string[];
  onBlockedCountriesChange: (v: string[]) => void;
}) {
  const t = useTranslations("postEditor.audience");
  const tAudience = useTranslations("publicPost.audience");
  const locale = useLocale();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [touched, setTouched] = useState(false);
  const issueVisible = passwordIssue != null && (showPasswordIssue || (touched && passwordIssue === "length"));

  function move(e: KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (index + step + POST_AUDIENCES.length) % POST_AUDIENCES.length;
    onAudienceChange(POST_AUDIENCES[next]);
    optionRefs.current[next]?.focus();
  }

  function addCountry(code: string) {
    const c = code.toUpperCase();
    if (!c || blockedCountries.includes(c) || blockedCountries.length >= MAX_BLOCKED_COUNTRIES) return;
    onBlockedCountriesChange([...blockedCountries, c]);
  }

  return (
    <div className="space-y-5" data-testid="audience-section">
      <div>
        <p id="audience-label" className="mb-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {t("label")}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="audience-label"
          className="grid grid-cols-2 border-y border-slate-200 dark:border-slate-700 sm:grid-cols-4"
        >
          {POST_AUDIENCES.map((option, i) => {
            const selected = option === audience;
            return (
              <button
                key={option}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onAudienceChange(option)}
                onKeyDown={(e) => move(e, i)}
                className={`focus-ring relative min-h-11 border-slate-200 px-2 py-2 text-center text-[13px] leading-tight transition-colors dark:border-slate-700 ${OPTION_EDGES[i]} ${
                  selected
                    ? "font-semibold text-slate-900 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-accent-600 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {tAudience(option)}
              </button>
            );
          })}
        </div>

        {(audience === "FOLLOWERS" || audience === "PASSWORD") && (
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{t("titlePublic")}</p>
        )}

        {audience === "PASSWORD" && (
          <div className="mt-2">
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onBlur={() => setTouched(true)}
              autoComplete="new-password"
              maxLength={400}
              placeholder={hasPassword ? t("newPasswordPlaceholder") : t("passwordPlaceholder")}
              aria-label={hasPassword ? t("newPasswordPlaceholder") : t("passwordPlaceholder")}
              aria-invalid={issueVisible || undefined}
              aria-describedby={issueVisible ? "audience-password-issue" : undefined}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 aria-[invalid=true]:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500 dark:aria-[invalid=true]:border-red-500"
            />
            {issueVisible && (
              <p id="audience-password-issue" role="alert" className="mt-1 text-[12px] text-red-600 dark:text-red-400">
                {passwordIssue === "length"
                  ? t("passwordLength")
                  : status === "DRAFT" || status === "UNPUBLISHED"
                    ? t("passwordRequired")
                    : t("passwordRequiredSave")}
              </p>
            )}
          </div>
        )}

        {audience === "UNLISTED" && (
          <>
            <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{t("unlistedHint")}</p>
            {status === "PUBLISHED" && unlistedUrl && <UnlistedLinkRow url={unlistedUrl} onRotate={onRotate} />}
          </>
        )}
      </div>

      <div>
        <p id="country-limit-label" className="mb-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {tAudience("REGION")}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-labelledby="country-limit-label" role="group">
          {blockedCountries.map((code) => {
            const name = countryName(code, locale);
            return (
              <span key={code} className="inline-flex items-center gap-0.5 text-[13px] text-slate-700 dark:text-slate-200">
                {name}
                <button
                  type="button"
                  onClick={() => onBlockedCountriesChange(blockedCountries.filter((c) => c !== code))}
                  aria-label={t("countryRemove", { country: name })}
                  title={t("countryRemove", { country: name })}
                  className="focus-ring grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            );
          })}
          <CountryCombobox
            value=""
            onChange={addCountry}
            disabled={blockedCountries.length >= MAX_BLOCKED_COUNTRIES}
            portal={false}
          />
        </div>
        {blockedCountries.length > 0 && (
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{t("countryHint")}</p>
        )}
      </div>
    </div>
  );
}

function UnlistedLinkRow({ url, onRotate }: { url: string; onRotate: () => Promise<boolean> }) {
  const t = useTranslations("postEditor.audience");
  const [confirm, confirmDialog] = useConfirm();
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [rotating, setRotating] = useState(false);
  const [rotateFailed, setRotateFailed] = useState(false);

  useEffect(() => {
    if (copy === "idle") return;
    const id = window.setTimeout(() => setCopy("idle"), 2000);
    return () => window.clearTimeout(id);
  }, [copy]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  async function rotate() {
    const ok = await confirm({ title: t("rotateTitle"), description: t("rotateBody"), confirmLabel: t("rotate") });
    if (!ok) return;
    setRotating(true);
    setRotateFailed(false);
    const done = await onRotate();
    setRotating(false);
    setRotateFailed(!done);
  }

  return (
    <div className="mt-2" data-testid="unlisted-link">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label={t("linkLabel")}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[12px] text-slate-600 outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-accent-500"
        />
        <button
          type="button"
          onClick={() => void copyLink()}
          className="focus-ring shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
        >
          {copy === "copied" ? t("copied") : copy === "failed" ? t("copyFailed") : t("copy")}
        </button>
        <button
          type="button"
          onClick={() => void rotate()}
          disabled={rotating}
          className="focus-ring shrink-0 rounded-lg px-1.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t("rotate")}
        </button>
      </div>
      {rotateFailed && (
        <p role="alert" className="mt-1 text-[12px] text-red-600 dark:text-red-400">
          {t("rotateFailed")}
        </p>
      )}
      {confirmDialog}
    </div>
  );
}
