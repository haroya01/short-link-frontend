import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/utils";
import type { MyLink } from "@/types";

export function destinationHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkListRow({ link }: { link: MyLink }) {
  const t = useTranslations("linkAnalytics");
  const clicks = link.humanClickCount ?? link.clickCount;
  return (
    <Link
      href={`/stats/${link.shortCode}`}
      className="focus-ring -mx-3 flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {link.note?.trim() || destinationHost(link.originalUrl)}
        </p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          {link.note?.trim() ? `/${link.shortCode} · ${destinationHost(link.originalUrl)}` : `/${link.shortCode}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNumber(clicks)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("humanClicks")}</p>
      </div>
    </Link>
  );
}
