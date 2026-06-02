"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Shared tab bar that unifies the two analytics surfaces — 글 분석 (/analytics, post + author metrics)
 * and 방문자 (/readers, profile-visit stats) — under one "분석" section, so the sidebar carries a
 * single entry instead of two. Link tabs (not state) since they're separate routes; the active one is
 * highlighted. Hrefs swap only the last path segment so they work on every host model.
 */
export function AnalyticsTabs({ active }: { active: "analytics" | "readers" }) {
  const t = useTranslations("blogWorkspace");
  const pathname = usePathname();
  const base = pathname.replace(/\/(analytics|readers)(\/.*)?$/, "");
  const tabs = [
    { key: "analytics", href: `${base}/analytics`, label: t("tabPostAnalytics") },
    { key: "readers", href: `${base}/readers`, label: t("tabVisitors") },
  ] as const;

  return (
    <nav className="mb-6 flex gap-1 border-b border-slate-100 text-[15px] font-semibold dark:border-slate-800">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2.5 transition-colors ${
            active === tab.key
              ? "border-accent-600 text-slate-900 dark:text-slate-100"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
