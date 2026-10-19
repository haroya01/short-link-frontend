"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { blogHref } from "@/lib/host";
import {
  listPublicFeed,
  listSuggestedAuthors,
  type PublicFeedItem,
  type SuggestedAuthor,
} from "@/modules/blog/api/public-posts";
import { rememberSearch } from "@/modules/blog/lib/recent-searches";
import { FollowSuggestions } from "@/modules/notes/components/follow-suggestions";
import { TrendingNoteTags } from "@/modules/notes/components/trending-note-tags";
import { TrendingNoteLinks } from "@/modules/notes/components/trending-note-links";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SearchLiveResults } from "@/modules/blog/components/search-live-results";
import { SuggestedAuthorsList } from "@/modules/blog/components/suggested-authors-list";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * Full-screen mobile 탐색 (explore) sheet, opened from the bottom-nav. Resting state = discovery
 * (trending posts + who to follow), which used to sit as a strip above the mobile feed and crowd the
 * first paint; folding it here keeps the feed content-first while search and discovery share one
 * intent ("뭐 읽지?"). Typing switches to live search (debounced); Enter / "see all" goes to the full
 * ?q= results page. Desktop keeps its own header search + sidebar rail.
 */
export function BlogSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("publicFeed");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");
  // Discovery (trending posts + who to follow) fills the sheet's resting state — the mobile feed no
  // longer carries a discovery strip above the posts, so this is where "둘러보기" lives now. Fetched
  // client-side (the sheet mounts in the layout, not the feed page) once per open session.
  const [trending, setTrending] = useState<PublicFeedItem[]>([]);
  const [authors, setAuthors] = useState<SuggestedAuthor[]>([]);
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false);
  const [noteSuggestions, setNoteSuggestions] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Portal target (<body>) only exists on the client; gate so the first render matches SSR (nothing).
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  // Escape + Tab containment + focus restore; the sheet places initial focus on its input itself.
  useFocusTrap(sheetRef, { active: open, onEscape: onClose, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    setValue(new URLSearchParams(window.location.search).get("q")?.trim() ?? "");
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(id);
    };
  }, [open]);

  // Lazily load discovery the first time the sheet opens; keep it across opens within the session.
  useEffect(() => {
    if (!open || discoveryLoaded) return;
    let live = true;
    Promise.all([listPublicFeed("trending", 0, 5), listSuggestedAuthors(5)]).then(([feed, au]) => {
      if (!live) return;
      if (feed.ok) setTrending(feed.data.items.slice(0, 5));
      if (au.ok) setAuthors(au.data);
      setDiscoveryLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [open, discoveryLoaded]);

  if (!open || !portalReady) return null;

  function navigate(href: string) {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) router.push(url.pathname + url.search);
    else window.location.href = href;
  }
  function goToAll(e?: React.FormEvent) {
    e?.preventDefault();
    const q = value.trim();
    onClose();
    if (!q) return;
    rememberSearch(q);
    navigate(blogHref(`/?q=${encodeURIComponent(q)}`));
  }

  const q = value.trim();

  // Portal to <body>: a transformed / will-change ancestor would otherwise clip this fixed sheet.
  return createPortal(
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("searchLabel")}
      className="fixed inset-0 z-50 flex flex-col bg-white origin-top animate-[search-sheet-in_240ms_var(--ease)_both] motion-reduce:animate-none dark:bg-slate-950 sm:hidden"
    >
      <form onSubmit={goToAll} role="search" className="flex h-14 shrink-0 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown") return;
              const first = sheetRef.current?.querySelector<HTMLButtonElement>("[data-domain-completion]");
              if (!first) return;
              e.preventDefault();
              first.focus();
            }}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-600 focus:ring-2 focus:ring-accent-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-live="polite">
        {!q && (
          <div
            className="pt-2"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-testid^='trending-note'] a, [data-testid='follow-suggestions'] a")) onClose();
            }}
          >
            {trending.length > 0 && (
              <section
                className="mb-6 px-2"
                data-testid="search-idle-trending"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) onClose();
                }}
              >
                <RailHeading>{t("searchIdleTrending")}</RailHeading>
                <FeedList>
                  {trending.map((item, i) => (
                    <FeedCard
                      key={`${item.author.username}/${item.slug}`}
                      item={item}
                      locale={locale}
                      showBookmark={false}
                      flushTop={i === 0}
                    />
                  ))}
                </FeedList>
              </section>
            )}

            <FollowSuggestions className="mb-6 px-2" onSettled={setNoteSuggestions} />
            <TrendingNoteTags className="mb-6 px-2" />
            <TrendingNoteLinks className="mb-6 px-2" />

            {noteSuggestions === false && <SuggestedAuthorsList authors={authors} onNavigate={onClose} />}
          </div>
        )}
        <SearchLiveResults
          value={value}
          active={open}
          inputRef={inputRef}
          onPickHandle={(handle) => {
            setValue(handle);
            inputRef.current?.focus();
          }}
          onNavigate={onClose}
          onSeeAll={() => goToAll()}
        />
      </div>
    </div>,
    document.body,
  );
}
