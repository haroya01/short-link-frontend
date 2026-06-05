"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { TagChip } from "@/modules/blog/components/tag-chip";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

/**
 * The reader's followed tags — "보고싶은 태그" gathered in one strip at the top of the feed. Renders
 * nothing until they follow at least one (so it stays invisible for everyone else). Per-device
 * (localStorage); each chip links to that topic's feed.
 */
export function MyTagsStrip() {
  const t = useTranslations("publicFeed");
  const { prefs } = useTagPrefs();
  if (prefs.followed.length === 0) return null;

  return (
    <section className="mx-auto mt-5 w-full max-w-2xl">
      <div className="mb-2 flex items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />
        <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
          {t("myTags")}
        </h2>
      </div>
      <ul className="flex flex-wrap gap-2">
        {prefs.followed.map((tag) => (
          <li key={tag}>
            <TagChip href={blogPath(`/tags/${encodeURIComponent(tag)}`)} label={tag} soft />
          </li>
        ))}
      </ul>
    </section>
  );
}
