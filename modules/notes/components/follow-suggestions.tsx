"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { authorHref } from "@/modules/blog/lib/author-href";
import { blogPath } from "@/lib/host";
import {
  dismissFollowSuggestion,
  listFollowSuggestions,
  type FollowSuggestion,
} from "@/modules/notes/api/follow-suggestions";
import type { RemoteAccount } from "@/modules/notes/api/notes";
import { listRemoteSuggestions } from "@/modules/notes/api/remote-safety";
import { RemoteFollowButton } from "./remote-account";

function RemoteSuggestion({ initial }: { initial: RemoteAccount }) {
  const [account, setAccount] = useState(initial);
  const name = account.displayName || account.username;
  return (
    <li data-testid={`remote-suggestion-${account.acct}`} className="-mx-2 rounded-surface px-2 py-2">
      <div className="flex items-center gap-2.5">
        <BlogLink
          href={blogPath(`/remote/${account.id}`)}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-surface"
        >
          <Avatar src={account.avatarUrl} name={account.username || account.acct} seed={null} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100">{name}</span>
            <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">@{account.acct}</span>
          </span>
        </BlogLink>
        <RemoteFollowButton account={account} onChange={setAccount} quiet />
        <span aria-hidden className="-mr-1 w-7 shrink-0" />
      </div>
    </li>
  );
}

/** 노트 피드 옆(넓은 화면) 팔로우 추천 — 마스토돈 "팔로우할 만한 계정". 로그인했을 때만, 있을 때만 선다. */
export function FollowSuggestions() {
  const t = useTranslations("notes");
  const locale = useLocale();
  const { authenticated } = useAuth();
  const [picks, setPicks] = useState<FollowSuggestion[]>([]);
  const [elsewhere, setElsewhere] = useState<RemoteAccount[]>([]);

  useEffect(() => {
    if (!authenticated) return;
    let alive = true;
    listFollowSuggestions()
      .then((found) => alive && setPicks(found.slice(0, 5)))
      .catch(() => undefined);
    void listRemoteSuggestions(3).then((found) => alive && setElsewhere(found));
    return () => {
      alive = false;
    };
  }, [authenticated]);

  if (!authenticated || (picks.length === 0 && elsewhere.length === 0)) return null;

  async function dismiss(pick: FollowSuggestion) {
    const before = picks;
    setPicks((list) => list.filter((p) => p.username !== pick.username));
    try {
      await dismissFollowSuggestion(pick.username);
    } catch {
      setPicks(before);
    }
  }

  return (
    <section aria-labelledby="follow-suggestions" data-testid="follow-suggestions" className="mt-8">
      <h2 id="follow-suggestions" className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("suggestionsTitle")}
      </h2>
      {picks.length > 0 && (
        <ul className="mt-2 space-y-1">
          {picks.map((pick) => (
            <li key={pick.username} data-testid={`suggestion-${pick.username}`} className="group relative -mx-2 rounded-surface px-2 py-2">
              <div className="flex items-center gap-2.5">
                <BlogLink href={authorHref(pick.username, locale)} className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-surface">
                  <Avatar src={pick.avatarUrl} name={pick.displayName || pick.username} seed={pick.userId} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                      {pick.displayName || pick.username}
                    </span>
                    <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                      {pick.reason === "FRIENDS" ? t("suggestionsFriends", { count: pick.mutuals }) : t("suggestionsPopular")}
                    </span>
                  </span>
                </BlogLink>
                <FollowButton username={pick.username} initialFollowerCount={0} compact quiet />
                <button
                  type="button"
                  onClick={() => void dismiss(pick)}
                  aria-label={t("suggestionsDismiss", { name: pick.displayName || pick.username })}
                  data-testid={`suggestion-dismiss-${pick.username}`}
                  className="focus-ring -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {elsewhere.length > 0 && (
        <div data-testid="remote-suggestions" className="mt-3">
          <h3 className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t("remoteSection")}</h3>
          <ul className="mt-1 space-y-1">
            {elsewhere.map((account) => (
              <RemoteSuggestion key={account.id} initial={account} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
