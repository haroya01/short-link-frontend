"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useRecentLinks } from "@/lib/recent-links";
import { truncateMiddle } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";

export function RecentLinks() {
  const t = useTranslations("recent");
  const { authenticated } = useAuth();
  const items = useRecentLinks();

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {t("title")}
        </h3>
        {!authenticated && (
          <Link
            href="/login"
            className="text-[11px] text-accent-700 hover:underline"
          >
            {t("claimCta")}
          </Link>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.shortCode} className="flex items-center gap-2 py-2 text-sm">
            <a
              href={item.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-medium text-slate-900 hover:underline"
            >
              /{item.shortCode}
            </a>
            <span
              className="flex-1 truncate text-xs text-slate-500"
              title={item.originalUrl}
            >
              {truncateMiddle(item.originalUrl, 56)}
            </span>
            <div className="flex items-center gap-1">
              <CopyButton size="sm" variant="ghost" label="" value={item.shortUrl} />
              <ShareButton url={item.shortUrl} title={item.shortUrl} iconOnly variant="ghost" />
              {authenticated && (
                <Link
                  href={`/stats/${item.shortCode}`}
                  className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  {t("viewStats")}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!authenticated && (
        <p className="mt-3 text-[11px] text-slate-400">{t("anonymousNote")}</p>
      )}
    </div>
  );
}
