"use client";

import { useTranslations } from "next-intl";
import type { PostStatus } from "@/modules/blog/api/posts";
import { TagInput } from "@/modules/blog/components/editor/tag-input";
import { SeriesSelect } from "@/modules/blog/components/editor/series-select";

/**
 * Post metadata fields — slug (editable while DRAFT, frozen once public), tags, series. Pure
 * presentation; a new field is added here only.
 */
export function EditorMeta({
  status,
  slug,
  onSlugChange,
  tags,
  onTagsChange,
  seriesId,
  onSeriesChange,
}: {
  status: PostStatus;
  slug: string;
  onSlugChange: (slug: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  seriesId: number | null;
  onSeriesChange: (seriesId: number | null) => void;
}) {
  const t = useTranslations("postEditor");
  return (
    <>
      {status === "DRAFT" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-mono text-slate-300">kurl.me/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            maxLength={200}
            // Slug is a code-like field — suppress the mobile autofill bar plus autocorrect/caps.
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            className="w-44 rounded-md border border-slate-200 bg-slate-50/60 px-2 py-1 font-mono text-base text-slate-600 outline-none transition-colors focus:border-accent-400 focus:bg-white sm:text-xs"
          />
          <span className="text-[11px] text-slate-400">{t("slugHint")}</span>
        </div>
      ) : (
        <p className="mt-2 font-mono text-xs text-slate-400">kurl.me/{slug}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t("tags")}
          </label>
          <TagInput tags={tags} onChange={onTagsChange} placeholder={t("tagsPlaceholder")} />
          <p className="mt-1 text-[11px] text-slate-400">{t("tagsHint")}</p>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t("series")}
          </label>
          <SeriesSelect
            value={seriesId}
            onChange={onSeriesChange}
            noneLabel={t("seriesNone")}
            emptyHint={t("seriesEmptyHint")}
          />
        </div>
      </div>
    </>
  );
}
