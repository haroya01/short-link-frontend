import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { linkDisplayName } from "@/lib/link-library-view";
import { formatNumber } from "@/lib/utils";
import type { MyLink } from "@/types";

function destinationHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function WeekLinkRow({ link }: { link: MyLink }) {
  const t = useTranslations("linkAnalytics");
  const week = link.clicksLast7d.reduce((sum, count) => sum + count, 0);
  const name = linkDisplayName(link);
  const host = destinationHost(link.originalUrl);
  return (
    <Link
      href={`/stats/${link.shortCode}`}
      className="focus-ring -mx-3 flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {name}
        </p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          <span className="font-mono">/{link.shortCode}</span>
          {name.replace(/^www\./, "") !== host && ` · ${host}`}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {formatNumber(week)}
        <span className="sr-only"> {t("humanClicks")}</span>
      </p>
    </Link>
  );
}
