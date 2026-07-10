"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { postHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { Avatar } from "@/modules/blog/components/avatar";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { blogCta } from "@/modules/blog/components/blog-cta";
import {
  clearReadingHistory,
  forgetRead,
  listReadingHistory,
  type ReadingHistoryEntry,
} from "@/modules/blog/api/reading-history";

/**
 * The owner's reading history (account-synced, newest read first). Each row links to the post with
 * a "forget" affordance; a header action clears the whole history — the reader controls what's kept
 * (it's their private record). Paged with a "load more".
 */
export function ReadingHistoryList({ username, locale }: { username: string; locale: string }) {
  const t = useTranslations("savedLibrary");
  const { ready, me } = useAuth();
  const isOwner = ready && me?.username === username;
  const [items, setItems] = useState<ReadingHistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async (next: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await listReadingHistory(next);
      setItems((prev) => (next === 0 ? res.items : [...prev, ...res.items]));
      setPage(res.page);
      setHasNext(res.hasNext);
    } catch {
      // 실패를 '기록 없음' 빈 상태로 위장하지 않도록 에러 상태를 세워 재시도를 노출한다.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    void load(0);
  }, [isOwner, load]);

  async function forget(postId: number) {
    setItems((prev) => prev.filter((h) => h.postId !== postId));
    try {
      await forgetRead(postId);
    } catch {
      /* optimistic — a failed forget isn't worth re-surfacing */
    }
  }

  async function clearAll() {
    setConfirmClear(false);
    setItems([]);
    setHasNext(false);
    try {
      await clearReadingHistory();
    } catch {
      /* swallow */
    }
  }

  if (ready && !isOwner) {
    return <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("private")}</p>;
  }
  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">{t("loadError")}</p>
        <button
          type="button"
          onClick={() => void load(0)}
          className="focus-ring rounded-full px-4 py-2 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
        >
          {t("retry")}
        </button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <FeedEmpty
        mark
        title={t("emptyHistory")}
        body={t("emptyHistoryBody")}
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
      <div className="mb-3 flex justify-end">
        {confirmClear ? (
          <span className="inline-flex items-center gap-2 text-[13px]">
            <span className="text-slate-500 dark:text-slate-400">{t("clearHistoryConfirm")}</span>
            <button
              type="button"
              onClick={clearAll}
              className="focus-ring rounded-full px-2.5 py-1 font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              {t("clearHistory")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="focus-ring rounded-full px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {t("clearHistoryCancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="focus-ring rounded-full px-2.5 py-1 text-[13px] text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t("clearHistory")}
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <li key={item.postId} className="flex items-start gap-3 py-3.5">
            <BlogLink
              href={postHref(item.username, item.slug, locale)}
              className="focus-ring group flex min-w-0 flex-1 items-start gap-3"
            >
              <Avatar src={item.avatarUrl} name={item.username} size="sm" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold text-slate-800 group-hover:text-slate-900 dark:text-slate-200">
                  {item.title}
                </span>
                <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">@{item.username}</span>
                {item.excerpt && (
                  <span className="mt-0.5 line-clamp-1 text-[13px] text-slate-500 dark:text-slate-400">
                    {item.excerpt}
                  </span>
                )}
              </span>
            </BlogLink>
            <button
              type="button"
              onClick={() => forget(item.postId)}
              aria-label={t("forget")}
              className="focus-ring mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {hasNext && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {error && <span className="text-[13px] text-rose-600 dark:text-rose-400">{t("loadError")}</span>}
          <button
            type="button"
            onClick={() => void load(page + 1)}
            disabled={loading}
            className="focus-ring rounded-full px-4 py-2 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 disabled:opacity-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t(error ? "retry" : "loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
