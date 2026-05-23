"use client";

import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
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
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
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
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
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
        <p className="text-[10px] text-slate-400">{t("noteHint")}</p>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {t("expiredMessageLabel")}
        </span>
        <textarea
          value={expiredMessage}
          onChange={(e) => onExpiredMessageChange(e.target.value)}
          placeholder={t("expiredMessagePlaceholder")}
          maxLength={500}
          disabled={busy || loadingDetail}
          rows={2}
          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <p className="text-[10px] text-slate-400">{t("expiredMessageHint")}</p>
      </label>
    </div>
  );
}
