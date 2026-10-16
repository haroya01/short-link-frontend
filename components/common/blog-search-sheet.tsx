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
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { useLiveSearch } from "@/modules/blog/lib/use-live-search";
import { remoteSearchHintVisible, useLivePeople } from "@/modules/blog/lib/use-live-people";
import { LivePeople, LiveRemotePeople } from "@/modules/blog/components/live-people";
import { useLiveRemoteLookup } from "@/modules/notes/lib/use-remote-resolution";
import { Avatar } from "@/modules/blog/components/avatar";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { AuthorName, META_HANDLE } from "@/modules/blog/components/author-name";

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
  const { results, loading, failed, retry } = useLiveSearch(value, open, 6);
  const { people, remote, remoteAnswered } = useLivePeople(value, open, 3);
  const lookup = useLiveRemoteLookup(value, open);
  const remoteHint = remoteSearchHintVisible({
    query: value,
    answered: remoteAnswered,
    accounts: remote,
    lookupActive: lookup !== null,
  });
  // Discovery (trending posts + who to follow) fills the sheet's resting state — the mobile feed no
  // longer carries a discovery strip above the posts, so this is where "둘러보기" lives now. Fetched
  // client-side (the sheet mounts in the layout, not the feed page) once per open session.
  const [trending, setTrending] = useState<PublicFeedItem[]>([]);
  const [authors, setAuthors] = useState<SuggestedAuthor[]>([]);
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false);
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
    if (q) navigate(blogHref(`/?q=${encodeURIComponent(q)}`));
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
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-600 focus:ring-2 focus:ring-accent-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-live="polite">
        {!q && (trending.length > 0 || authors.length > 0) && (
          <div className="pt-2">
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

            {authors.length > 0 && (
              <section data-testid="search-idle-follow">
                <RailHeading className="mb-1 px-2">{t("searchIdleFollow")}</RailHeading>
                <ul>
                  {authors.map(({ author, postCount }) => (
                    <li key={author.username} className="flex items-center gap-3 px-2 py-2">
                      <a
                        href={authorHref(author.username, locale)}
                        onClick={() => onClose()}
                        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-surface"
                      >
                        <Avatar src={author.avatarUrl} name={author.displayName || author.username} seed={author.id} size="md" />
                        <span className="flex min-w-0 flex-col">
                          <AuthorName
                            name={author.displayName}
                            handle={author.username}
                            className="text-[14px] font-semibold text-slate-800 dark:text-slate-200"
                          />
                          <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                            {t("railPostCount", { count: postCount })}
                          </span>
                        </span>
                      </a>
                      <FollowButton username={author.username} initialFollowerCount={0} compact quiet />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        {q && <LivePeople people={people} onNavigate={onClose} />}
        {q && <LiveRemotePeople accounts={remote} lookup={lookup} hint={remoteHint} onNavigate={onClose} />}
        {q && loading && results.length === 0 && (
          <ul className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800" aria-busy>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-3 py-3">
                <div className="h-2.5 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-2 h-4 w-3/4 rounded bg-slate-200/80 dark:bg-slate-800/80" />
              </li>
            ))}
          </ul>
        )}
        {q && !loading && results.length === 0 && failed && (
          <div role="alert" className="flex flex-col items-center gap-2 px-3 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("searchFailed")}</p>
            <button
              type="button"
              onClick={retry}
              className="focus-ring rounded-full px-4 py-2 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
            >
              {t("retry")}
            </button>
          </div>
        )}
        {q && !loading && results.length === 0 && !failed && people.length === 0 && remote.length === 0 && !lookup && (
          <p className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t("searchEmptyTitle")}</p>
        )}
        {results.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((item) => (
              <li key={`${item.author.username}/${item.slug}`}>
                <a
                  href={postHref(item.author.username, item.slug, locale)}
                  onClick={() => onClose()}
                  className="focus-ring flex items-center gap-3 rounded-lg px-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    {item.tags[0] && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {item.tags[0]}
                      </span>
                    )}
                    <span
                      lang={contentLang(item.title, item.languageTag)}
                      className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100"
                    >
                      {item.title}
                    </span>
                    <AuthorName
                      name={item.author.displayName}
                      handle={item.author.username}
                      className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400"
                      handleClassName={META_HANDLE}
                    />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {q && (
          <div className="mt-2 px-3 py-3">
            <button
              type="button"
              onClick={() => goToAll()}
              className={blogCta({ variant: "text", className: "touch-target" })}
            >
              {t("searchResultsFor", { q })}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
