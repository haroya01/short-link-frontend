"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { useToast } from "@/components/ui/toast";
import { blogPath } from "@/lib/host";
import { authorHref } from "@/modules/blog/lib/author-href";
import { listMutedUsers, unmuteUser, type MutedUser } from "@/modules/notes/api/notes";
import { listRemoteMutes, unmuteRemote, type RemoteMute } from "@/modules/notes/api/remote-safety";
import { useWhen } from "./scheduled-notes";
import { SafetyElsewhere, SafetyList, SafetyRow } from "./safety-list";

export function MutedAccountSettings() {
  const t = useTranslations("notes");
  const locale = useLocale();
  const when = useWhen();
  const { toast } = useToast();
  const [users, setUsers] = useState<MutedUser[] | null>(null);
  const [remote, setRemote] = useState<RemoteMute[]>([]);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([listMutedUsers().then((found) => found, () => null), listRemoteMutes()]).then(([here, elsewhere]) => {
      if (!alive.current) return;
      setFailed(here === null);
      setUsers(here ?? []);
      setRemote(elsewhere ?? []);
    });
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const until = (expiresAt: string | null) => (expiresAt ? t("mutedUntil", { when: when(expiresAt) }) : t("muteForever"));

  async function unmute(username: string) {
    try {
      await unmuteUser(username);
      setUsers((current) => current?.filter((u) => u.username !== username) ?? null);
      toast(t("unmutedToast", { username }));
    } catch {
      toast(t("muteFailed"), "error");
    }
  }

  async function unmuteElsewhere(mute: RemoteMute) {
    try {
      await unmuteRemote(mute.account.id);
      setRemote((current) => current.filter((m) => m.account.id !== mute.account.id));
      toast(t("unmutedToast", { username: mute.account.acct }));
    } catch {
      toast(t("muteFailed"), "error");
    }
  }

  if (users === null) return null;
  return (
    <section aria-labelledby="muted-users-title" className="mt-8">
      <h2 id="muted-users-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("mutedUsersTitle")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("mutedUsersHint")}</p>
      {failed ? (
        <ErrorState onRetry={load} />
      ) : users.length === 0 && remote.length === 0 ? (
        <p className="rounded-surface border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("mutedUsersEmpty")}
        </p>
      ) : (
        <>
          {users.length > 0 && (
            <SafetyList testId="muted-users">
              {users.map((user) => (
                <SafetyRow
                  key={user.username}
                  href={authorHref(user.username, locale)}
                  handle={user.username}
                  avatarUrl={user.avatarUrl}
                  seed={user.id}
                  detail={until(user.expiresAt)}
                  action={t("unmute")}
                  actionLabel={t("unmuteUser", { username: user.username })}
                  onAction={() => void unmute(user.username)}
                />
              ))}
            </SafetyList>
          )}
          {remote.length > 0 && (
            <SafetyElsewhere spaced={users.length > 0}>
              <SafetyList testId="remote-mutes">
                {remote.map((mute) => (
                  <SafetyRow
                    key={mute.account.id}
                    href={blogPath(`/remote/${mute.account.id}`)}
                    handle={mute.account.acct}
                    avatarUrl={mute.account.avatarUrl}
                    seed={null}
                    detail={until(mute.expiresAt)}
                    action={t("unmute")}
                    actionLabel={t("unmuteUser", { username: mute.account.acct })}
                    onAction={() => void unmuteElsewhere(mute)}
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
