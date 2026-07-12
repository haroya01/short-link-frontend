"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";

/**
 * Blog-settings block that lists every followed topic with an unfollow control. The feed's tag strip
 * only surfaces followed tags that currently have posts in view, so a tag whose recent posts have
 * aged out becomes impossible to drop from there — this reads the full `prefs.followed` set, so it
 * covers those aged-out tags too. It lives on the blog settings page (behind the sign-in gate), so
 * it's the management home for signed-in readers; a signed-out guest who followed tags device-locally
 * still toggles from the feed strip. Series subscriptions get the same "see them all, remove any"
 * treatment on the 시리즈 tab; this is the topic twin of that.
 *
 * Each chip links to the tag feed (soft nav — stays in the blog surface); the trailing × unfollows
 * in place. `toggleFollow` persists to the account when signed in and to localStorage otherwise, and
 * broadcasts so the feed strip updates in step. (The component itself is auth-agnostic — the gate is
 * the page, not this block.)
 */
export function FollowedTagsSetting() {
  const t = useTranslations("blogWorkspace");
  const { prefs, toggleFollow } = useTagPrefs();
  const followed = prefs.followed;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("settingsFollowedTags")}
      </h2>
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-[12px] text-slate-500 dark:text-slate-500">
          {t("settingsFollowedTagsHint")}
        </p>
        {followed.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {t("settingsFollowedTagsEmpty")}
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {followed.map((tag) => (
              <li key={tag}>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-[13px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Link
                    href={blogPath(`/tags/${encodeURIComponent(tag)}`)}
                    className="focus-ring rounded-full transition-colors hover:text-accent-700 dark:hover:text-accent-400"
                  >
                    {tag}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFollow(tag)}
                    aria-label={t("settingsUnfollowTag", { tag })}
                    title={t("settingsUnfollowTag", { tag })}
                    className="focus-ring grid h-5 w-5 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
