"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { refreshBlockedUsers, unblockAuthor, useBlockedUsers } from "@/modules/blog/lib/user-blocks";

export function BlockedUserSettings() {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { toast } = useToast();
  const users = useBlockedUsers();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    refreshBlockedUsers()
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  async function unblock(username: string) {
    try {
      await unblockAuthor(username);
      toast(t("unblockedToast", { username }));
    } catch {
      toast(t("unblockFailed"), "error");
    }
  }

  if (!loaded) return null;
  return (
    <section aria-labelledby="blocked-users-title" className="mt-8">
      <h2 id="blocked-users-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("blockedUsersTitle")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("blockedUsersHint")}</p>
      {users.length === 0 ? (
        <p className="rounded-surface border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("blockedUsersEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-surface border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
          {users.map((user) => (
            <li key={user.username} className="flex items-center gap-3 py-3">
              <BlogLink
                href={authorHref(user.username, locale)}
                className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded"
              >
                <Avatar src={user.avatarUrl} name={user.username} seed={user.id} size="sm" />
                <span className="truncate text-[14px] text-slate-800 dark:text-slate-100">@{user.username}</span>
              </BlogLink>
              <button
                type="button"
                onClick={() => void unblock(user.username)}
                aria-label={t("unblockUser", { username: user.username })}
                className="focus-ring rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
              >
                {t("unblock")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
