"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import type { FollowRequest } from "@/modules/notifications/api/follow-requests";
import { useAnswerFollowRequest } from "@/modules/notifications/lib/use-notifications";
import { cn } from "@/lib/utils";

/** 승인·거절 한 쌍 — 요청 알림 행과 요청 목록이 같이 쓴다. */
export function FollowRequestAnswer({
  origin,
  name,
  className,
}: {
  origin: FollowRequest["origin"];
  name: string;
  className?: string;
}) {
  const t = useTranslations("notifications");
  const { toast } = useToast();
  const answer = useAnswerFollowRequest();

  function reply(approve: boolean) {
    answer.mutate(
      { origin, approve },
      {
        onSuccess: () => {
          if (approve) toast(t("followRequestApproved", { name }));
        },
        onError: () => toast(t("followRequestError"), "error"),
      },
    );
  }

  return (
    <span className={cn("pointer-events-auto inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => reply(false)}
        disabled={answer.isPending}
        data-testid="follow-request-reject"
        className="focus-ring inline-flex h-8 items-center rounded-full border border-slate-300 px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600"
      >
        {t("followRequestReject")}
      </button>
      <button
        type="button"
        onClick={() => reply(true)}
        disabled={answer.isPending}
        data-testid="follow-request-approve"
        className="focus-ring inline-flex h-8 items-center rounded-full bg-accent-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-50 dark:bg-accent-600 dark:hover:bg-accent-500"
      >
        {t("followRequestApprove")}
      </button>
    </span>
  );
}
