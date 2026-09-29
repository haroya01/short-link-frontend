"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { useRecentLinks } from "@/lib/recent-links";

const LIMIT = 5;

/**
 * The home page's "what did I make last time" list, right under the shortener: this browser's
 * 24-hour record (the guest links it can still claim). Signed-in people have the dashboard as their
 * home, so this is the signed-out half only — before /me settles it renders in the `anon` slot so
 * the pre-paint auth hint keeps it off a signed-in first paint.
 */
export function HomeRecent({ exclude = [] }: { exclude?: string[] }) {
  const { ready, authenticated } = useAuth();
  if (!ready) {
    return (
      <div data-auth-slot="anon">
        <BrowserRecent exclude={exclude} />
      </div>
    );
  }
  return authenticated ? null : <BrowserRecent exclude={exclude} />;
}

function BrowserRecent({ exclude }: { exclude: string[] }) {
  const t = useTranslations("home");
  const items = useRecentLinks()
    .filter((item) => !exclude.includes(item.shortCode))
    .slice(0, LIMIT);
  if (items.length === 0) return null;
  return (
    <RecentList
      title={t("recentTitle")}
      aside={<span className="text-[12px] text-slate-500 dark:text-slate-400">{t("recentKept")}</span>}
      footer={
        <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("recentClaim")}{" "}
          <Link
            href="/login"
            className="focus-ring rounded-sm font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
          >
            {t("recentLogin")}
          </Link>
        </p>
      }
    >
      {items.map((item) => (
        <li key={item.shortCode} className="flex items-center gap-3 py-2">
          <a
            href={item.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring shrink-0 rounded-sm font-mono text-[13px] font-semibold text-slate-900 transition-colors hover:text-accent-700 dark:text-slate-100 dark:hover:text-accent-400"
          >
            /{item.shortCode}
          </a>
          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-500 dark:text-slate-400" title={item.originalUrl}>
            {item.originalUrl}
          </span>
          <span className="flex shrink-0 items-center">
            <CopyButton size="sm" variant="ghost" label="" value={item.shortUrl} />
            <ShareButton url={item.shortUrl} title={item.shortUrl} iconOnly variant="ghost" />
          </span>
        </li>
      ))}
    </RecentList>
  );
}

function RecentList({
  title,
  aside,
  footer,
  children,
}: {
  title: string;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="home-recent-title" className="mt-2">
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
        <h2 id="home-recent-title" className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {aside}
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>
      {footer}
    </section>
  );
}
