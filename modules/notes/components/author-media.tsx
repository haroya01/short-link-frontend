"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, ImageIcon, Images } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/error-state";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { listAuthorMedia, type ProfileMediaFeed, type ProfileMediaItem } from "@/modules/notes/api/notes";

export function MediaCell({ item, username }: { item: ProfileMediaItem; username: string }) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const label = [
    item.media.altText || t("mediaNoAlt"),
    item.mediaCount > 1 ? t("mediaCount", { count: item.mediaCount }) : null,
    item.sensitive ? t("mediaSensitive") : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <BlogLink
      href={authorHref(username, locale, `notes/${item.noteId}`)}
      aria-label={label}
      data-media-cell={item.noteId}
      data-sensitive={item.sensitive || undefined}
      className="focus-ring group relative block aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800"
    >
      {item.media.contentType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.media.url}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-300 ease-[var(--ease)] group-hover:scale-[1.03] motion-reduce:transition-none ${
            item.sensitive ? "scale-110 blur-xl" : ""
          }`}
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-slate-400">
          <ImageIcon aria-hidden className="h-6 w-6" />
        </span>
      )}
      {item.sensitive && (
        <span aria-hidden className="absolute inset-0 grid place-items-center bg-slate-950/20 text-white">
          <EyeOff className="h-5 w-5 drop-shadow" />
        </span>
      )}
      {item.mediaCount > 1 && (
        <span
          aria-hidden
          data-media-count
          className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-slate-950/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
        >
          <Images className="h-3 w-3" />
          {item.mediaCount}
        </span>
      )}
    </BlogLink>
  );
}

export function AuthorMedia({ username, initial }: { username: string; initial: ProfileMediaFeed | null }) {
  const t = useTranslations("notes");
  const [items, setItems] = useState<ProfileMediaItem[]>(initial?.items ?? []);
  const [page, setPage] = useState(initial?.page ?? 0);
  const [hasNext, setHasNext] = useState(initial?.hasNext ?? false);
  const [state, setState] = useState<"loading" | "ready" | "error">(initial ? "ready" : "loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(() => {
    setState((current) => (current === "ready" ? current : "loading"));
    listAuthorMedia(username, 0)
      .then((feed) => {
        setItems(feed.items);
        setPage(0);
        setHasNext(feed.hasNext);
        setState("ready");
      })
      .catch(() => setState((current) => (current === "ready" ? current : "error")));
  }, [username]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function more() {
    setLoadingMore(true);
    try {
      const feed = await listAuthorMedia(username, page + 1);
      setItems((current) => [...current, ...feed.items.filter((i) => !current.some((c) => c.noteId === i.noteId))]);
      setPage(feed.page);
      setHasNext(feed.hasNext);
    } finally {
      setLoadingMore(false);
    }
  }

  if (state === "loading" && items.length === 0) {
    return (
      <div aria-busy="true" data-testid="media-grid-skeleton" className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }
  if (state === "error" && items.length === 0) return <ErrorState title={t("loadFailed")} onRetry={reload} />;
  if (items.length === 0) return <BlogEmpty icon={ImageIcon} title={t("emptyMedia")} />;

  return (
    <div>
      <ul data-testid="media-grid" className="grid grid-cols-3 gap-0.5">
        {items.map((item) => (
          <li key={item.noteId}>
            <MediaCell item={item} username={username} />
          </li>
        ))}
      </ul>
      {hasNext && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={more}
            disabled={loadingMore}
            className="focus-ring rounded-surface border border-slate-300 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
