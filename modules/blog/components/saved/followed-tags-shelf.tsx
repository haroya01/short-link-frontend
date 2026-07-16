"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

/**
 * The reader's followed topics as a browse surface inside 저장한 글 — the *consumption* twin of the
 * settings management block ({@link FollowedTagsSetting}). Here each tag is a chip that opens its feed
 * (tap to read that topic gathered together); removing a follow stays in settings, reached by the quiet
 * "태그 관리" link, so this shelf reads as "where to go next" rather than a settings panel. Followed
 * tags otherwise only surfaced on the feed strip when a followed topic had posts currently in view — a
 * tag whose posts had aged out had no home to browse from. This gives every followed tag a durable
 * reading entry.
 */
export function FollowedTagsShelf() {
  const t = useTranslations("blogWorkspace");
  const { prefs } = useTagPrefs();
  const followed = prefs.followed;

  if (followed.length === 0) {
    // 빈 안내만 두면 막다른 길 — 팔로우할 태그를 찾을 곳(태그 목록)을 같은 링크 문법으로 이어준다.
    return (
      <div>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("curationTagsEmpty")}</p>
        <BlogLink
          href={blogPath("/tags")}
          className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-[12px] font-medium text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
        >
          {t("curationTagsBrowse")}
          <ArrowRight className="h-3 w-3" />
        </BlogLink>
      </div>
    );
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {followed.map((tag) => (
          <li key={tag}>
            <BlogLink
              href={blogPath(`/tags/${encodeURIComponent(tag)}`)}
              className="focus-ring inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
            >
              {tag}
            </BlogLink>
          </li>
        ))}
      </ul>
      <BlogLink
        href={blogPath("/settings")}
        className="focus-ring mt-3 inline-flex items-center gap-1 rounded text-[12px] font-medium text-slate-400 transition-colors hover:text-accent-700 dark:text-slate-500 dark:hover:text-accent-400"
      >
        {t("curationTagsManage")}
        <ArrowRight className="h-3 w-3" />
      </BlogLink>
    </div>
  );
}
