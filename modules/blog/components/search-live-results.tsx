"use client";

import { useEffect, useState, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { postHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { useLiveSearch } from "@/modules/blog/lib/use-live-search";
import { remoteSearchHintVisible, useLivePeople } from "@/modules/blog/lib/use-live-people";
import { LivePeople, LiveRemotePeople } from "@/modules/blog/components/live-people";
import { useLiveRemoteLookup } from "@/modules/notes/lib/use-remote-resolution";
import { useDomainCompletions } from "@/modules/notes/lib/use-domain-completions";
import { DomainCompletions } from "@/modules/notes/components/domain-completions";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { AuthorName, META_HANDLE } from "@/modules/blog/components/author-name";
import { listRelatedTags } from "@/modules/blog/api/public-posts";
import { RelatedTags } from "@/modules/blog/components/related-tags";
import { ErrorState } from "@/components/common/error-state";

export function SearchLiveResults({
  value,
  active,
  inputRef,
  onPickHandle,
  onNavigate,
  onSeeAll,
}: {
  value: string;
  active: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onPickHandle: (handle: string) => void;
  onNavigate: () => void;
  onSeeAll: () => void;
}) {
  const t = useTranslations("publicFeed");
  const locale = useLocale();
  const { results, loading, failed, retry } = useLiveSearch(value, active, 6);
  const { people, remote, remoteAnswered } = useLivePeople(value, active, 3);
  const completions = useDomainCompletions(value, active);
  const lookup = useLiveRemoteLookup(value, active && !completions.hold);
  const related = useRelatedTags(value, active);
  const remoteHint =
    !completions.hold &&
    remoteSearchHintVisible({
      query: value,
      answered: remoteAnswered,
      accounts: remote,
      lookupActive: lookup !== null,
    });
  const q = value.trim();
  if (!q) return null;

  return (
    <>
      {related && <RelatedTags tags={related} label={t("relatedTags")} className="px-3 pb-3 pt-1" onPick={onNavigate} />}
      <DomainCompletions handles={completions.handles} typed={value} inputRef={inputRef} onPick={onPickHandle} />
      <LivePeople people={people} onNavigate={onNavigate} />
      <LiveRemotePeople accounts={remote} lookup={lookup} hint={remoteHint} onNavigate={onNavigate} />
      {loading && results.length === 0 && (
        <ul className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800" aria-busy>
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="px-3 py-3">
              <div className="h-2.5 w-12 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-3/4 rounded bg-slate-200/80 dark:bg-slate-800/80" />
            </li>
          ))}
        </ul>
      )}
      {!loading && results.length === 0 && failed && (
        <div role="alert" className="px-3">
          <ErrorState message={t("searchFailed")} onRetry={retry} />
        </div>
      )}
      {!loading &&
        results.length === 0 &&
        !failed &&
        people.length === 0 &&
        remote.length === 0 &&
        !lookup &&
        !completions.hold && (
          <p className="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">{t("searchEmptyTitle")}</p>
        )}
      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {results.map((item) => (
            <li key={`${item.author.username}/${item.slug}`}>
              <a
                href={postHref(item.author.username, item.slug, locale)}
                onClick={onNavigate}
                className="focus-ring flex items-center gap-3 rounded-surface px-3 py-3"
              >
                <span className="min-w-0 flex-1">
                  {item.tags[0] && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.tags[0]}</span>
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
      <div className="mt-2 px-3 py-3">
        <button type="button" onClick={onSeeAll} className={blogCta({ variant: "text", className: "touch-target" })}>
          {t("searchResultsFor", { q })}
        </button>
      </div>
    </>
  );
}

function useRelatedTags(value: string, active: boolean) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(value.trim()), 300);
    return () => window.clearTimeout(id);
  }, [value]);
  const { data } = useQuery({
    queryKey: ["search", "related", query],
    queryFn: () => listRelatedTags(query),
    enabled: active && query.length >= 2,
    staleTime: 5 * 60_000,
  });
  return query === value.trim() ? data : undefined;
}
