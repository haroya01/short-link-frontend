import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PublicPostSeriesNav } from "@/lib/api/public-posts";

export function TagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full bg-accent-50 px-3 py-1 text-[13px] font-medium text-accent-700"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

/** velog-style series banner shown on a post that belongs to a series. */
export async function SeriesNav({ series }: { series: PublicPostSeriesNav }) {
  const t = await getTranslations("publicPost");
  return (
    <nav className="mb-10 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <a href={`/series/${series.slug}`} className="group flex items-center gap-2">
        <Layers className="h-4 w-4 text-accent-600" />
        <span className="text-[15px] font-semibold text-slate-900 group-hover:text-accent-700">
          {series.title}
        </span>
        <span className="text-[13px] text-slate-400">
          {t("seriesPosition", { position: series.position, total: series.total })}
        </span>
      </a>
      <div className="mt-3 flex items-stretch justify-between gap-3 text-[13px]">
        {series.prev ? (
          <a
            href={`/${series.prev.slug}`}
            className="group flex min-w-0 flex-1 items-center gap-2 text-slate-500 transition-colors hover:text-accent-700"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{series.prev.title}</span>
          </a>
        ) : (
          <span className="flex-1" />
        )}
        {series.next ? (
          <a
            href={`/${series.next.slug}`}
            className="group flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-slate-500 transition-colors hover:text-accent-700"
          >
            <span className="truncate">{series.next.title}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </a>
        ) : (
          <span className="flex-1" />
        )}
      </div>
    </nav>
  );
}
