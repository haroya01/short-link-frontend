"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { blogHref } from "@/lib/host";
import { listSuggestedAuthors, type SuggestedAuthor } from "@/modules/blog/api/public-posts";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SearchLiveResults } from "@/modules/blog/components/search-live-results";
import { SuggestedAuthorsList } from "@/modules/blog/components/suggested-authors-list";
import { rememberSearch, useRecentSearches } from "@/modules/blog/lib/recent-searches";
import { FollowSuggestions } from "@/modules/notes/components/follow-suggestions";
import { RemoteFeed } from "@/modules/notes/components/remote-feed";
import { TrendingNoteLinks } from "@/modules/notes/components/trending-note-links";
import { TrendingNoteTags } from "@/modules/notes/components/trending-note-tags";

const searchHref = (q: string) => blogHref(`/?q=${encodeURIComponent(q)}`);

export function ExploreScreen() {
  const t = useTranslations("publicFeed");
  const tNotes = useTranslations("notes");
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recents = useRecentSearches();
  const [noteSuggestions, setNoteSuggestions] = useState<boolean | null>(null);
  const [authors, setAuthors] = useState<SuggestedAuthor[]>([]);
  const q = value.trim();

  useEffect(() => {
    if (noteSuggestions !== false) return;
    let live = true;
    listSuggestedAuthors(5).then((found) => live && found.ok && setAuthors(found.data));
    return () => {
      live = false;
    };
  }, [noteSuggestions]);

  function go(query: string) {
    rememberSearch(query);
    const url = new URL(searchHref(query), window.location.origin);
    if (url.origin === window.location.origin) router.push(url.pathname + url.search);
    else window.location.href = url.href;
  }

  return (
    <div>
      <h1 className="sr-only">{t("exploreTitle")}</h1>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q) go(q);
        }}
        className="relative"
      >
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
            const first = document.querySelector<HTMLButtonElement>("[data-domain-completion]");
            if (!first) return;
            e.preventDefault();
            first.focus();
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-600 focus:ring-2 focus:ring-accent-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none sm:text-[15px]"
        />
      </form>

      <div aria-live="polite">
        <SearchLiveResults
          value={value}
          active
          inputRef={inputRef}
          onPickHandle={(handle) => {
            setValue(handle);
            inputRef.current?.focus();
          }}
          onNavigate={() => rememberSearch(q)}
          onSeeAll={() => go(q)}
        />
      </div>

      {!q && (
        <>
          {recents.list.length > 0 && (
            <section aria-labelledby="recent-searches" data-testid="recent-searches" className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <RailHeading id="recent-searches">{t("recentSearches")}</RailHeading>
                <button
                  type="button"
                  onClick={recents.clear}
                  className="focus-ring touch-target rounded text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {t("recentSearchesClear")}
                </button>
              </div>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
                {recents.list.map((recent) => (
                  <li key={recent}>
                    <BlogLink
                      href={searchHref(recent)}
                      onClick={() => rememberSearch(recent)}
                      className="focus-ring -mx-2 block truncate rounded-surface px-2 py-2.5 text-[15px] text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {recent}
                    </BlogLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <TrendingNoteTags className="mt-8" />
          <TrendingNoteLinks className="mt-8" />
          <FollowSuggestions className="mt-8" onSettled={setNoteSuggestions} />
          {noteSuggestions === false && <SuggestedAuthorsList authors={authors} className="-mx-2 mt-8" />}
          <section aria-labelledby="explore-remote" className="mt-10">
            <RailHeading id="explore-remote">{tNotes("feedFederated")}</RailHeading>
            <RemoteFeed />
          </section>
        </>
      )}
    </div>
  );
}
