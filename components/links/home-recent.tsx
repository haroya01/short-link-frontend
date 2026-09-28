"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { Link } from "@/i18n/navigation";
import { useMyLinks } from "@/lib/api/links.queries";
import { useAuth } from "@/lib/auth";
import { useRecentLinks } from "@/lib/recent-links";

const LIMIT = 5;

/**
 * The home page's "what did I make last time" list, right under the shortener. Signed-out
 * visitors see this browser's 24-hour record (the guest links it can still claim); signed-in
 * users see their account's newest links with real click counts.
 */
export function HomeRecent({ exclude = [] }: { exclude?: string[] }) {
  const { ready, authenticated } = useAuth();
  if (!ready) {
    // /me 가 오기 전 — pre-paint 인증 힌트가 로그인 사용자라고 하면 계정 목록 자리를 먼저 잡아,
    // 목록이 도착할 때 아래 내용이 밀리지 않게 한다(로그아웃 방문자에겐 CSS 로 숨음).
    return (
      <div data-auth-slot="authed">
        <AccountRecentPending />
      </div>
    );
  }
  return authenticated ? <AccountRecent exclude={exclude} /> : <BrowserRecent exclude={exclude} />;
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

function AccountRecent({ exclude }: { exclude: string[] }) {
  const t = useTranslations("home");
  const query = useMyLinks({ size: LIMIT + exclude.length, sort: "createdAt", dir: "desc" });
  const items = (query.data?.pages[0]?.items ?? [])
    .filter((link) => !exclude.includes(link.shortCode))
    .slice(0, LIMIT);

  if (query.isPending) return <AccountRecentPending />;
  if (items.length === 0) return null;

  return (
    <RecentList
      title={t("recentTitle")}
      aside={
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
        >
          {t("recentAll")} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {items.map((link) => (
        <li key={link.shortCode} className="flex items-center gap-3 py-2">
          <Link
            href={`/stats/${link.shortCode}`}
            className="focus-ring shrink-0 rounded-sm font-mono text-[13px] font-semibold text-slate-900 transition-colors hover:text-accent-700 dark:text-slate-100 dark:hover:text-accent-400"
          >
            /{link.shortCode}
          </Link>
          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-500 dark:text-slate-400" title={link.originalUrl}>
            {link.originalUrl}
          </span>
          <span className="shrink-0 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
            {t("recentClicks", { count: link.humanClickCount ?? link.clickCount })}
          </span>
          <CopyButton size="sm" variant="ghost" label="" value={link.shortUrl} />
        </li>
      ))}
    </RecentList>
  );
}

function AccountRecentPending() {
  const t = useTranslations("home");
  return (
    <RecentList title={t("recentTitle")} busy>
      {[0, 1, 2].map((i) => (
        <li key={i} className="py-2.5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </li>
      ))}
    </RecentList>
  );
}

function RecentList({
  title,
  aside,
  footer,
  busy,
  children,
}: {
  title: string;
  aside?: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="home-recent-title" aria-busy={busy || undefined} className="mt-2">
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
