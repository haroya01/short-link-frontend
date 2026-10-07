"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchFollowStatus } from "@/modules/blog/lib/follow-status-cache";

/** 이름 옆 자물쇠 — 팔로우를 직접 승인하는 작가(마스토돈 잠긴 계정). 팔로우 버튼과 같은 상태 조회를 나눠 쓴다. */
export function LockedMark({ username }: { username: string }) {
  const t = useTranslations("publicPost");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchFollowStatus(username)
      .then((s) => alive && setLocked(s.locked ?? false))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [username]);

  if (!locked) return null;
  return (
    <span title={t("lockedAccount")} data-testid="author-locked" className="inline-flex shrink-0">
      <Lock aria-label={t("lockedAccount")} role="img" className="h-4 w-4 text-slate-400 dark:text-slate-500 sm:h-5 sm:w-5" />
    </span>
  );
}
