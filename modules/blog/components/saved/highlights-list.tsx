"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Highlighter, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { quoteHref } from "@/modules/blog/components/connection-block";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { listMyHighlights, type MyHighlightItem } from "@/modules/blog/api/highlights";
import { LoadError } from "@/modules/blog/components/saved/load-error";

/**
 * 내 서재 — every passage the viewer has drawn a highlight on, newest first, each anchored to the post
 * it lives on. A quote reads as a green left-rule pull (the same silhouette as a highlight block in a
 * path), with the post it came from as a quiet eyebrow that deep-links back to that exact sentence
 * (`?hl=`). Owner-gated, with a title/quote filter so a growing library stays searchable.
 */
export function HighlightsList({ username, locale }: { username: string; locale: string }) {
  const t = useTranslations("savedLibrary");
  const { ready, me } = useAuth();
  const isOwner = ready && me?.username === username;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MyHighlightItem[]>([]);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await listMyHighlights());
    } catch {
      // 목록 로드 실패를 '아직 없음' 빈 상태로 위장하지 않고 재시도를 노출한다.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    void load();
  }, [isOwner, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (h) => [h.quote, h.note, h.postTitle].some((text) => text?.toLowerCase().includes(q)),
    );
  }, [items, query]);

  if (ready && !isOwner) {
    return <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("private")}</p>;
  }
  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error) {
    return <LoadError message={t("highlightsLoadError")} onRetry={() => void load()} />;
  }
  if (items.length === 0) {
    return (
      <BlogEmpty
        icon={Highlighter}
        title={t("emptyHighlights")}
        action={
          <a href={blogHref("/")} className={blogCta({ variant: "secondary" })}>
            {t("browseFeed")}
          </a>
        }
      />
    );
  }

  return (
    <div>
      <div className="relative mb-4 max-w-2xl">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("highlightsSearch")}
          aria-label={t("highlightsSearch")}
          className="focus-ring w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-[14px] text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("noResults")}</p>
      ) : (
        <ul className="flex max-w-2xl flex-col">
          {filtered.map((h) => (
            <li key={h.id} className="group border-b border-slate-100 last:border-b-0 dark:border-slate-800">
              <BlogLink
                href={quoteHref(h.postUsername, h.postSlug, h.quote, locale, h.id)}
                className="focus-ring -mx-3 block rounded-surface px-3 py-5 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40"
              >
                {/* The post this passage was drawn on — a quiet eyebrow that doubles as the link back. */}
                <span className="line-clamp-1 text-[12px] font-medium text-slate-500 transition-colors group-hover:text-accent-700 dark:text-slate-400 dark:group-hover:text-accent-400">
                  {h.postTitle}
                </span>
                <span className="mt-1.5 flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 w-[3px] shrink-0 rounded-full bg-accent-600 dark:bg-accent-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                      {h.quote}
                    </span>
                    {h.note && (
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {h.note}
                      </span>
                    )}
                  </span>
                </span>
              </BlogLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
