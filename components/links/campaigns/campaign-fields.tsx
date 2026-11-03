"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/ui/required-mark";
import type { CampaignPostEndAction } from "@/types";

export function CampaignField({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** The single control this labels; without it the field is a labelled group of controls. */
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const groupLabelId = useId();
  const text = (
    <>
      {label}
      {required && <RequiredMark />}
    </>
  );
  const labelClass = "block text-[13px] font-medium text-slate-900 dark:text-slate-100";
  return (
    <div
      className="space-y-2"
      role={htmlFor ? undefined : "group"}
      aria-labelledby={htmlFor ? undefined : groupLabelId}
    >
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {text}
        </label>
      ) : (
        <p id={groupLabelId} className={labelClass}>
          {text}
        </p>
      )}
      {children}
      {hint && <p className="text-[12px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function PostEndFields({
  action,
  onAction,
  message,
  onMessage,
  redirectUrl,
  onRedirectUrl,
}: {
  action: CampaignPostEndAction;
  onAction: (action: CampaignPostEndAction) => void;
  message: string;
  onMessage: (message: string) => void;
  redirectUrl: string;
  onRedirectUrl: (url: string) => void;
}) {
  const t = useTranslations("campaignApp.new");
  return (
    <CampaignField label={t("postEndLabel")} required>
      <div className="space-y-2">
        <PolicyOption active={action === "KEEP"} onClick={() => onAction("KEEP")} title={t("policy.keepTitle")} body={t("policy.keepBody")} />
        <PolicyOption active={action === "EXPIRE"} onClick={() => onAction("EXPIRE")} title={t("policy.expireTitle")} body={t("policy.expireBody")} />
        {action === "EXPIRE" && (
          <div className="ml-6 mt-2 space-y-1.5">
            <textarea
              value={message}
              onChange={(e) => onMessage(e.target.value.slice(0, 500))}
              placeholder={t("messagePlaceholder")}
              aria-label={t("messageLabel")}
              rows={3}
              className="block w-full resize-y rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            />
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {t("messageHint")} <span className="tabular-nums">{message.length}/500</span>
            </p>
          </div>
        )}
        <PolicyOption active={action === "REDIRECT"} onClick={() => onAction("REDIRECT")} title={t("policy.redirectTitle")} body={t("policy.redirectBody")} />
      </div>
      {action === "REDIRECT" && (
        <div className="mt-3">
          <Input
            type="url"
            value={redirectUrl}
            onChange={(e) => onRedirectUrl(e.target.value)}
            placeholder="https://example.com/after-event"
            aria-label={t("redirectLabel")}
            required
          />
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{t("redirectHint")}</p>
        </div>
      )}
    </CampaignField>
  );
}

function PolicyOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "w-full rounded-lg border px-4 py-3 text-left transition-colors " +
        (active
          ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50")
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            "grid h-4 w-4 place-items-center rounded-full border " +
            (active ? "border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900")
          }
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900" />}
        </span>
        <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{title}</span>
      </div>
      <p className="mt-1.5 pl-6 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{body}</p>
    </button>
  );
}

export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
