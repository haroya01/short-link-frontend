"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { blogHref } from "@/lib/host";
import { searchPublicFeed, type PublicFeedItem } from "@/modules/blog/api/public-posts";
import { postHref } from "@/modules/blog/components/feed-card";

/**
 * Full-screen mobile search, opened from the bottom-nav 검색 tab. Live: results stream in as you type
 * (debounced) so search feels dynamic instead of a blind submit-and-navigate. Enter (or "see all")
 * still goes to the full ?q= results page. Desktop keeps its own header search.
 */
export function BlogSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("publicFeed");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<PublicFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(new URLSearchParams(window.location.search).get("q")?.trim() ?? "");
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Debounced live search — fires ~250ms after typing stops; stale responses ignored via `live`.
  useEffect(() => {
    const q = value.trim();
    if (!open || !q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let live = true;
    const id = window.setTimeout(async () => {
      const res = await searchPublicFeed(q, "recent", 0, 6).catch(() => null);
      if (!live) return;
      setResults(res?.ok ? res.data.items.slice(0, 6) : []);
      setLoading(false);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [value, open]);

  if (!open) return null;

  function navigate(href: string) {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) router.push(url.pathname + url.search);
    else window.location.href = href;
  }
  function goToAll(e?: React.FormEvent) {
    e?.preventDefault();
    const q = value.trim();
    onClose();
    if (q) navigate(blogHref(`/?q=${encodeURIComponent(q)}`));
  }

  const q = value.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("searchLabel")}
      className="fixed inset-0 z-50 flex flex-col bg-white sm:hidden"
    >
      <form onSubmit={goToAll} role="search" className="flex h-14 shrink-0 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-live="polite">
        {q && loading && results.length === 0 && (
          <ul className="animate-pulse divide-y divide-slate-100" aria-busy>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-3 py-3">
                <div className="h-2.5 w-12 rounded bg-slate-100" />
                <div className="mt-2 h-4 w-3/4 rounded bg-slate-200/80" />
              </li>
            ))}
          </ul>
        )}
        {q && !loading && results.length === 0 && (
          <p className="px-3 py-10 text-center text-sm text-slate-500">{t("searchEmptyTitle")}</p>
        )}
        {results.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {results.map((item) => (
              <li key={`${item.author.username}/${item.slug}`}>
                <a
                  href={postHref(item.author.username, item.slug, locale)}
                  onClick={() => onClose()}
                  className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    {item.tags[0] && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-700">
                        {item.tags[0]}
                      </span>
                    )}
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">
                      @{item.author.username}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {q && (
          <button
            type="button"
            onClick={() => goToAll()}
            className="focus-ring mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-50"
          >
            {t("searchResultsFor", { q })}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
