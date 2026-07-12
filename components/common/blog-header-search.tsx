"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { blogHref } from "@/lib/host";
import { searchPublicFeed, type PublicFeedItem } from "@/modules/blog/api/public-posts";
import { postHref } from "@/modules/blog/components/feed-card";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";

/**
 * Global blog search — the single search entry point, in the header so it's reachable from every
 * blog surface (feed home, post, tags, author) rather than trapped in one page's body. A compact 🔍
 * that expands on click to keep the header's right cluster uncrowded. Submitting soft-navigates to
 * the feed's `?q=` view (server-rendered results), velog-style. Reads the current query from the URL
 * on mount to prefill — deliberately not via useSearchParams, so mounting this in the shared header
 * doesn't opt every blog page out of static rendering.
 */
export function BlogHeaderSearch({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const t = useTranslations("publicFeed");
  const locale = useLocale();
  const router = useRouter();
  const [results, setResults] = useState<PublicFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  // On the discovery hub (feed home) the field rests open on ≥sm so search reads as a primary action;
  // deep pages keep the compact 🔍. Start collapsed and only expand client-side — never rest open on
  // mobile, where the expanded field would push the login + product switcher off a ~360px header.
  const [open, setOpen] = useState(false);
  // Drives the width unfold: render at glyph width, then flip to full so `transition-[width]` animates
  // the field open (icon stays put, placeholder reveals as it widens — no scaleX text squish).
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  // The live dropdown's own visibility, decoupled from the field's width `open`: on the hub the field
  // rests open with a query, but the panel must still dismiss on outside-click/Esc without collapsing
  // the field or clearing the query. Reopens on focus/typing.
  const [panelOpen, setPanelOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only steal focus when the user opens the field by tapping the glyph — not on the resting/URL open.
  const focusOnOpen = useRef(false);

  useDismiss(panelOpen, formRef, () => setPanelOpen(false));

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (q) setValue(q);
    // Expanded field only on ≥sm (mobile keeps the glyph so the header doesn't overflow).
    if (!window.matchMedia("(min-width: 640px)").matches) return;
    if (q || defaultOpen) setOpen(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (open && focusOnOpen.current) {
      inputRef.current?.focus();
      focusOnOpen.current = false;
    }
  }, [open]);

  // Flip to the expanded width one frame after opening so the field animates from glyph → full.
  useEffect(() => {
    if (!open) {
      setExpanded(false);
      return;
    }
    const id = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Live results dropdown — debounced, same engine as the mobile search sheet (unified search UX).
  useEffect(() => {
    const query = value.trim();
    if (!open || !query) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let live = true;
    const id = window.setTimeout(async () => {
      const res = await searchPublicFeed(query, "recent", 0, 5).catch(() => null);
      if (!live) return;
      setResults(res?.ok ? res.data.items.slice(0, 5) : []);
      setLoading(false);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [value, open]);

  // Soft-navigate when the target stays on this origin (dev /blog-preview path, or prod's same blog
  // host) so the view swaps in without a full reload; only a genuine cross-origin hop hard-navigates.
  function navigate(href: string) {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) {
      router.push(url.pathname + url.search);
    } else {
      window.location.href = href;
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    setPanelOpen(false);
    if (!q) {
      setOpen(false);
      return;
    }
    navigate(blogHref(`/?q=${encodeURIComponent(q)}`));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          focusOnOpen.current = true;
          setOpen(true);
        }}
        aria-label={t("searchLabel")}
        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} role="search" className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setPanelOpen(true);
        }}
        onFocus={() => setPanelOpen(true)}
        onBlur={() => {
          // Keep the field open on the hub even when empty; elsewhere an empty blur collapses it.
          if (!value.trim() && !defaultOpen) setOpen(false);
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className={cn(
          "h-8 rounded-full border border-slate-200 bg-white pl-8 pr-7 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none",
          "transition-[width,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          // Unfold by width from the glyph: collapsed ≈ the 🔍 button, expands to the full field.
          expanded ? "w-40 sm:w-56" : "w-8",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
            // If results are showing (?q= in the URL), clearing should exit them — not just blank
            // the box, which would otherwise strand the user in stale results with no way back.
            if (new URLSearchParams(window.location.search).get("q")) {
              navigate(blogHref("/"));
            }
          }}
          aria-label={t("searchClear")}
          className="focus-ring absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {value.trim() && panelOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading && results.length === 0 ? (
            <div className="flex justify-center py-6 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {results.map((item) => (
                <li key={`${item.author.username}/${item.slug}`}>
                  <a
                    href={postHref(item.author.username, item.slug, locale)}
                    onClick={() => setPanelOpen(false)}
                    className="block px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {item.tags[0] && (
                      <span className="text-[10px] font-semibold text-accent-700 dark:text-accent-400">
                        {item.tags[0]}
                      </span>
                    )}
                    <span className="line-clamp-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      @{item.author.username}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">{t("searchEmptyTitle")}</p>
          )}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-3 py-2.5 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:border-slate-800 dark:text-accent-400 dark:hover:bg-accent-500/10"
          >
            {t("searchResultsFor", { q: value.trim() })}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </form>
  );
}
