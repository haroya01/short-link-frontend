"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  getNotificationPolicy,
  updateNotificationPolicy,
  type NotificationPolicy,
  type PolicyLevel,
} from "@/modules/notifications/api/notification-policy";

const CATEGORIES: { key: keyof NotificationPolicy; labelKey: string; hintKey: string }[] = [
  { key: "forNotFollowing", labelKey: "policyNotFollowing", hintKey: "policyNotFollowingHint" },
  { key: "forNotFollowers", labelKey: "policyNotFollowers", hintKey: "policyNotFollowersHint" },
  { key: "forNewAccounts", labelKey: "policyNewAccounts", hintKey: "policyNewAccountsHint" },
  { key: "forPrivateMentions", labelKey: "policyPrivateMentions", hintKey: "policyPrivateMentionsHint" },
];

const LEVELS: { level: PolicyLevel; labelKey: string }[] = [
  { level: "ACCEPT", labelKey: "policyAccept" },
  { level: "FILTER", labelKey: "policyFilter" },
  { level: "DROP", labelKey: "policyDrop" },
];

/**
 * 블로그 설정 > 알림 거르기 — 마스토돈 알림 정책. 범주마다 받기·거르기·버리기 세 갈래를 한 줄 세그먼트로
 * 고르고, 고르는 즉시 저장한다(실패하면 그 줄만 되돌림). 걸러진 알림은 알림 페이지 맨 위에 모인다.
 */
export function NotificationPolicySettings() {
  const t = useTranslations("notifications");
  const { toast } = useToast();
  const [policy, setPolicy] = useState<NotificationPolicy | null>(null);

  useEffect(() => {
    let alive = true;
    getNotificationPolicy()
      .then((p) => alive && setPolicy(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!policy) return null;

  async function choose(key: keyof NotificationPolicy, level: PolicyLevel) {
    if (!policy || policy[key] === level) return;
    const before = policy;
    setPolicy({ ...policy, [key]: level });
    try {
      setPolicy(await updateNotificationPolicy({ [key]: level }));
    } catch {
      setPolicy(before);
      toast(t("policySaveError"), "error");
    }
  }

  return (
    <section className="mt-8" aria-labelledby="notification-policy">
      <h2 id="notification-policy" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("policyTitle")}
      </h2>
      <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("policySubtitle")}</p>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 p-2 dark:divide-slate-800 dark:border-slate-800">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
            <span className="flex min-w-0 flex-col text-slate-700 dark:text-slate-200">
              {t(c.labelKey)}
              <span className="text-[12px] text-slate-500 dark:text-slate-400">{t(c.hintKey)}</span>
            </span>
            <div
              role="radiogroup"
              aria-label={t(c.labelKey)}
              data-testid={`policy-${c.key}`}
              className="inline-flex shrink-0 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800"
            >
              {LEVELS.map(({ level, labelKey }) => {
                const on = policy[c.key] === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => void choose(c.key, level)}
                    className={cn(
                      "focus-ring h-8 rounded-full px-3 text-[13px] font-medium transition-colors duration-200",
                      on
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                    )}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
