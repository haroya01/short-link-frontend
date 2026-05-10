"use client";

import type { useTranslations } from "next-intl";
import { Input } from "../../ui/input";

type Props = {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  /** Scraped originals — shown as input placeholders so the user knows the default. */
  placeholders: { title: string; description: string; image: string };
  busy: boolean;
  loadingDetail: boolean;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onImageChange: (v: string) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function OgOverrideSection({
  ogTitle,
  ogDescription,
  ogImage,
  placeholders,
  busy,
  loadingDetail,
  onTitleChange,
  onDescriptionChange,
  onImageChange,
  t,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{t("og.description")}</p>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {t("og.titleLabel")}
        </span>
        <Input
          type="text"
          value={ogTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={placeholders.title || t("og.titlePlaceholder")}
          maxLength={300}
          disabled={busy || loadingDetail}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {t("og.descriptionLabel")}
        </span>
        <textarea
          value={ogDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={placeholders.description || t("og.descriptionPlaceholder")}
          maxLength={800}
          disabled={busy || loadingDetail}
          rows={3}
          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {t("og.imageLabel")}
        </span>
        <Input
          type="url"
          value={ogImage}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder={placeholders.image || "https://..."}
          maxLength={1024}
          disabled={busy || loadingDetail}
        />
      </label>
    </div>
  );
}
