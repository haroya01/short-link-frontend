"use client";

import type { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

type Props = {
  originalUrl: string;
  note: string;
  busy: boolean;
  loadingDetail: boolean;
  onOriginalUrlChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function BasicSection({
  originalUrl,
  note,
  busy,
  loadingDetail,
  onOriginalUrlChange,
  onNoteChange,
  t,
}: Props) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {t("originalUrl")}
        </span>
        <Input
          type="url"
          inputMode="url"
          value={originalUrl}
          onChange={(e) => onOriginalUrlChange(e.target.value)}
          placeholder="https://..."
          disabled={busy}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
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
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("noteHint")}</p>
      </label>
    </div>
  );
}
