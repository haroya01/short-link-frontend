"use client";

import type { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

type Props = {
  password: string;
  removePassword: boolean;
  passwordProtected: boolean;
  maxViewsInput: string;
  viewCount: number;
  maxViews: number | null;
  busy: boolean;
  loadingDetail: boolean;
  onPasswordChange: (v: string) => void;
  onRemovePasswordChange: (v: boolean) => void;
  onMaxViewsChange: (v: string) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function ProtectionSection({
  password,
  removePassword,
  passwordProtected,
  maxViewsInput,
  viewCount,
  maxViews,
  busy,
  loadingDetail,
  onPasswordChange,
  onRemovePasswordChange,
  onMaxViewsChange,
  t,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("protection.description")}</p>
      <div className="space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("protection.passwordLabel")}
        </span>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value);
            if (e.target.value) onRemovePasswordChange(false);
          }}
          placeholder={
            passwordProtected ? t("protection.passwordSetHint") : t("protection.passwordPlaceholder")
          }
          maxLength={200}
          disabled={busy || loadingDetail || removePassword}
          autoComplete="new-password"
        />
        {passwordProtected && (
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={removePassword}
              onChange={(e) => {
                onRemovePasswordChange(e.target.checked);
                if (e.target.checked) onPasswordChange("");
              }}
              disabled={busy || loadingDetail}
            />
            {t("protection.removePassword")}
          </label>
        )}
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("protection.maxViewsLabel")}
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={maxViewsInput}
          onChange={(e) => onMaxViewsChange(e.target.value)}
          placeholder={t("protection.maxViewsPlaceholder")}
          disabled={busy || loadingDetail}
        />
        {maxViews != null && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("protection.viewCountHint", { current: viewCount, max: maxViews })}
          </p>
        )}
      </label>
    </div>
  );
}
