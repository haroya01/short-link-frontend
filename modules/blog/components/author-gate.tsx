"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { fetchFollowStatus } from "@/modules/blog/lib/follow-status-cache";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { BlockedAuthorNotice } from "@/modules/notes/components/blocked-author-notice";

export function useBlocksViewer(username: string): boolean {
  const { ready, authenticated } = useAuth();
  const [answer, setAnswer] = useState<{ username: string; blocks: boolean } | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let live = true;
    fetchFollowStatus(username)
      .then((status) => {
        if (live) setAnswer({ username, blocks: status.blocksViewer === true });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ready, authenticated, username]);

  return ready && authenticated && answer?.username === username && answer.blocks;
}

export function AuthorGate({
  username,
  noticeClassName,
  children,
}: {
  username: string;
  noticeClassName?: string;
  children: ReactNode;
}) {
  const t = useTranslations("notes");
  const blocked = useBlockedNames().has(username);
  const blocksViewer = useBlocksViewer(username);

  if (blocked) {
    return (
      <div className={noticeClassName}>
        <BlockedAuthorNotice username={username} />
      </div>
    );
  }
  if (blocksViewer) {
    return (
      <div className={noticeClassName}>
        <p
          role="status"
          data-testid="author-unavailable"
          className="mt-4 rounded-surface border border-slate-200 px-4 py-3 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300"
        >
          {t("authorUnavailable")}
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
