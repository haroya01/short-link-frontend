"use client";

import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  originalUrl: string;
  expiresAt: string;
  note: string;
  expiredMessage: string;
  busy: boolean;
  loadingDetail: boolean;
  onOriginalUrlChange: (v: string) => void;
  onExpiresAtChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onExpiredMessageChange: (v: string) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function BasicSection({
  originalUrl,
  expiresAt,
  note,
  expiredMessage,
  busy,
  loadingDetail,
  onOriginalUrlChange,
  onExpiresAtChange,
  onNoteChange,
  onExpiredMessageChange,
  t,
}: Props) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("originalUrl")}
        </span>
        <Input
          type="url"
          inputMode="url"
          value={originalUrl}
          onChange={(e) => onOriginalUrlChange(e.target.value)}
          placeholder="https://..."
          disabled={busy}
          autoFocus
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("expiresAt")}
        </span>
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => onExpiresAtChange(e.target.value)}
            disabled={busy}
            className="flex-1"
          />
          {expiresAt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onExpiresAtChange("")}
              disabled={busy}
            >
              {t("clear")}
            </Button>
          )}
        </div>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("noteLabel")}
        </span>
        <Input
          type="text"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={t("notePlaceholder")}
          maxLength={280}
          disabled={busy || loadingDetail}
        />
        <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("noteHint")}</p>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("expiredMessageLabel")}
        </span>
        <Textarea
          value={expiredMessage}
          onChange={(e) => onExpiredMessageChange(e.target.value)}
          placeholder={t("expiredMessagePlaceholder")}
          maxLength={500}
          disabled={busy || loadingDetail}
          rows={2}
        />
        <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("expiredMessageHint")}</p>
      </label>
    </div>
  );
}
