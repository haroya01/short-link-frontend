"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TagInput } from "@/modules/blog/components/editor/tag-input";

/**
 * A whisper-quiet tags line under the title on the writing canvas — so topics are visible while writing
 * instead of hidden behind the 발행 button. Existing tags read as muted `#tag` text (tap to edit); with
 * none, a barely-there "주제 추가" affordance. Either opens the SAME chip input the publish dialog uses,
 * on the shared tags state, so there is one source of truth. Reads as part of the paper, not chrome:
 * muted slate, no borders or cards, aligned with the title's masthead.
 *
 * Isolated so it is trivially revertible — remove the one <CanvasTags/> line on the write page.
 */
export function CanvasTags({
  tags,
  onChange,
  suggestions,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
}) {
  const t = useTranslations("postEditor");
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="mt-3 animate-fade-in">
        <TagInput
          tags={tags}
          onChange={onChange}
          suggestions={suggestions}
          placeholder={t("tagsPlaceholder")}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="focus-ring mt-1 rounded px-1 text-[12px] text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          {t("tagsDone")}
        </button>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="focus-ring mt-3 self-start rounded px-1 text-[13px] text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-400"
      >
        + {t("addTopics")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={t("tagsEdit")}
      className="focus-ring mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 self-start rounded px-1 text-left text-[13px] text-slate-500 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
    >
      {tags.map((tag) => (
        <span key={tag}>#{tag}</span>
      ))}
    </button>
  );
}
