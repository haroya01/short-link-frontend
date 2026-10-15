"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { blogPath } from "@/lib/host";
import { authorHref } from "@/modules/blog/lib/author-href";
import { refreshBlockedUsers, unblockAuthor, useBlockedUsers } from "@/modules/blog/lib/user-blocks";
import type { RemoteAccount } from "@/modules/notes/api/notes";
import { listRemoteBlocks, setRemoteBlocked } from "@/modules/notes/api/remote-safety";
import { SafetyElsewhere, SafetyList, SafetyRow } from "./safety-list";

export function BlockedUserSettings() {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { toast } = useToast();
  const users = useBlockedUsers();
  const [remote, setRemote] = useState<RemoteAccount[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([refreshBlockedUsers().catch(() => {}), listRemoteBlocks()]).then(([, elsewhere]) => {
      if (!alive) return;
      setRemote(elsewhere);
      setLoaded(true);
    });
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

  async function unblockElsewhere(account: RemoteAccount) {
    try {
      await setRemoteBlocked(account.id, false);
      setRemote((current) => current?.filter((a) => a.id !== account.id) ?? null);
      toast(t("unblockedToast", { username: account.acct }));
    } catch {
      toast(t("unblockFailed"), "error");
    }
  }

  if (!loaded) return null;
  const elsewhere = remote ?? [];
  return (
    <section aria-labelledby="blocked-users-title" className="mt-8">
      <h2 id="blocked-users-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("blockedUsersTitle")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("blockedUsersHint")}</p>
      {users.length === 0 && elsewhere.length === 0 ? (
        <p className="rounded-surface border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("blockedUsersEmpty")}
        </p>
      ) : (
        <>
          {users.length > 0 && (
            <SafetyList>
              {users.map((user) => (
                <SafetyRow
                  key={user.username}
                  href={authorHref(user.username, locale)}
                  handle={user.username}
                  avatarUrl={user.avatarUrl}
                  seed={user.id}
                  action={t("unblock")}
                  actionLabel={t("unblockUser", { username: user.username })}
                  onAction={() => void unblock(user.username)}
                />
              ))}
            </SafetyList>
          )}
          {elsewhere.length > 0 && (
            <SafetyElsewhere spaced={users.length > 0}>
              <SafetyList testId="remote-blocks">
                {elsewhere.map((account) => (
                  <SafetyRow
                    key={account.id}
                    href={blogPath(`/remote/${account.id}`)}
                    handle={account.acct}
                    avatarUrl={account.avatarUrl}
                    seed={null}
                    action={t("unblock")}
                    actionLabel={t("unblockUser", { username: account.acct })}
                    onAction={() => void unblockElsewhere(account)}
                  />
                ))}
              </SafetyList>
            </SafetyElsewhere>
          )}
        </>
      )}
    </section>
  );
}
