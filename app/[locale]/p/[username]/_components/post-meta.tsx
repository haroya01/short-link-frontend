import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import type { PublicPostSeriesNav } from "@/modules/blog/api/public-posts";

export function TagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag}>
          {/* Tag pages live on the blog host (blog.kurl.me/tags/{tag}); posts are on the author
              subdomain, so this is a cross-host link. */}
          <a
            href={blogHref(`/tags/${encodeURIComponent(tag)}`)}
            className="inline-block rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-1"
          >
            {tag}
          </a>
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
      <a
        href={`/series/${series.slug}`}
        className="group flex items-center gap-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        <Layers className="h-4 w-4 text-accent-600" />
        <span className="text-[15px] font-semibold text-slate-900 group-hover:text-accent-700">
          {series.title}
        </span>
        <span className="text-[13px] text-slate-500">
          {t("seriesPosition", { position: series.position, total: series.total })}
        </span>
      </a>
      <div className="mt-3 flex items-stretch justify-between gap-3 text-[13px]">
        {series.prev ? (
          <a
            href={`/${series.prev.slug}`}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded text-slate-500 transition-colors hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
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
            className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded text-right text-slate-500 transition-colors hover:text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
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
