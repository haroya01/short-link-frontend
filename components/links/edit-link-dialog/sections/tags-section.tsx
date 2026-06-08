"use client";

import type { useTranslations } from "next-intl";
import { TagInput } from "@/components/common/tag-input";

type Props = {
  tags: string[];
  suggestions: string[];
  busy: boolean;
  loadingDetail: boolean;
  onChange: (next: string[]) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function TagsSection({ tags, suggestions, busy, loadingDetail, onChange, t }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("tags.description")}</p>
      <TagInput
        value={tags}
        onChange={onChange}
        suggestions={suggestions}
        disabled={busy || loadingDetail}
      />
    </div>
  );
}
