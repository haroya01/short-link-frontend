import { DATE_LOCALE } from "@/lib/date";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { PublicPostListItem } from "@/modules/blog/api/public-posts";

const WEEKS = 53;
const DAY = 86_400_000;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Empty → light cell; then three brand-green steps. Kept on the accent ramp (not a rainbow) so the
// graph reads as "this author's kurl, accumulating" — the brand color is the only hue on the page.
const CELL = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-accent-200 dark:bg-accent-500/30",
  "bg-accent-400 dark:bg-accent-500/60",
  "bg-accent-600 dark:bg-accent-500",
];
const level = (c: number) => (c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : 3);

/**
 * GitHub-contribution-style heatmap of an author's publishing over the last ~year — a quiet record of
 * accumulation (the thing a content feed loses). Each column is a week, each cell a day, shaded by how
 * many posts went out that day. Derived purely from the post list's publishedAt; no backend needed.
 * Server-rendered, so "today" is the request/ISR time (page revalidates every 30s).
 */
export async function ContributionGraph({
  posts,
  locale,
}: {
  posts: PublicPostListItem[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicPost" });
  const fmt = new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const counts = new Map<string, number>();
  for (const p of posts) counts.set(ymd(new Date(p.publishedAt)), (counts.get(ymd(new Date(p.publishedAt))) ?? 0) + 1);

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  // Walk back WEEKS*7 days, then snap the start to a Sunday so every column is a full aligned week.
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY);
  start.setDate(start.getDate() - start.getDay());

  const columns: { date: Date; key: string; count: number }[][] = [];
  let col: { date: Date; key: string; count: number }[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY)) {
    const key = ymd(d);
    col.push({ date: new Date(d), key, count: counts.get(key) ?? 0 });
    if (col.length === 7) {
      columns.push(col);
      col = [];
    }
  }
  if (col.length) columns.push(col);

  const yearAgo = new Date(end.getTime() - 364 * DAY);
  let total = 0;
  for (const c of columns.flat()) if (c.date >= yearAgo) total += c.count;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{t("activityHeading")}</h2>
        <span className="text-[12px] text-slate-500 dark:text-slate-400">
          {t("activitySummary", { count: total })}
        </span>
      </div>
      <div
        role="img"
        aria-label={t("activitySummary", { count: total })}
        className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-[3px]" aria-hidden>
          {columns.map((week, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <span
                  key={cell.key}
                  title={`${fmt.format(cell.date)} · ${
                    cell.count === 0 ? t("activityNone") : t("activityCount", { count: cell.count })
                  }`}
                  className={cn("h-[11px] w-[11px] rounded-[2px]", CELL[level(cell.count)])}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <span>{t("activityLess")}</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className={cn("h-[11px] w-[11px] rounded-[2px]", CELL[l])} />
        ))}
        <span>{t("activityMore")}</span>
      </div>
    </section>
  );
}
