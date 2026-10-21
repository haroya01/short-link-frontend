"use client";

import { useTranslations } from "next-intl";
import { TagInput } from "@/components/common/tag-input";
import type { TagLimits } from "@/lib/tag-entry";

// Backend TagSanitizer: MAX_TAGS_PER_LINK, MAX_NAME_LENGTH.
const LINK_TAG_LIMITS: TagLimits = { max: 20, maxLen: 50 };

type Props = {
  tags: string[];
  suggestions: string[];
  busy: boolean;
  loadingDetail: boolean;
  onChange: (next: string[]) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function TagsSection({ tags, suggestions, busy, loadingDetail, onChange, t }: Props) {
  const tTags = useTranslations("tags");
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("tags.description")}</p>
      <TagInput
        tags={tags}
        onChange={onChange}
        limits={LINK_TAG_LIMITS}
        suggestions={suggestions}
        placeholder={tTags("inputPlaceholder")}
        disabled={busy || loadingDetail}
      />
    </div>
  );
}
