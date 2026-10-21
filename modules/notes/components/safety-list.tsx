"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";

export function SafetyList({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <ul
      data-testid={testId}
      className="divide-y divide-slate-200 rounded-surface border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800"
    >
      {children}
    </ul>
  );
}

export function SafetyElsewhere({ children, spaced }: { children: ReactNode; spaced: boolean }) {
  const t = useTranslations("notes");
  return (
    <div className={spaced ? "mt-4" : undefined}>
      <h3 className="mb-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t("remoteSection")}</h3>
      {children}
    </div>
  );
}

export function SafetyRow({
  href,
  handle,
  avatarUrl,
  detail,
  action,
  actionLabel,
  onAction,
}: {
  href: string;
  handle: string;
  avatarUrl: string | null;
  detail?: string;
  action: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <BlogLink href={href} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded">
        <Avatar src={avatarUrl} name={handle} handle={handle} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-[14px] text-slate-800 dark:text-slate-100">@{handle}</span>
          {detail && <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">{detail}</span>}
        </span>
      </BlogLink>
      <button
        type="button"
        onClick={onAction}
        aria-label={actionLabel}
        className="focus-ring shrink-0 rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
      >
        {action}
      </button>
    </li>
  );
}
