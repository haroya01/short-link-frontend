"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDismiss } from "@/hooks/use-dismiss";
import { blogHref } from "@/lib/host";
import { authorHref } from "@/modules/blog/components/feed-card";
import { deletePost } from "@/modules/blog/api/posts";

/**
 * Owner-only 수정/삭제 affordance on a published post. The public post page is a server component, so
 * ownership (me.username === author) is resolved here in a client island — renders nothing for every
 * other viewer. Delete confirms in-app (a quiet popover, role="dialog") rather than a native
 * window.confirm, so it stays locale-aware and on-brand. On success it does a full navigation to the
 * author's home: that works across both topologies (path /p/ + author subdomain) and leaves no deleted
 * post lingering in any client cache.
 */
export function PostOwnerActions({
  postId,
  authorUsername,
  locale,
}: {
  postId: number;
  authorUsername: string;
  locale: string;
}) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("common");
  const { ready, me } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useDismiss(confirming, ref, () => setConfirming(false));

  if (!ready || me?.username !== authorUsername) return null;

  async function onDelete() {
    setBusy(true);
    setError(false);
    try {
      await deletePost(postId);
      window.location.href = authorHref(authorUsername, locale);
    } catch {
      setBusy(false);
      setError(true);
    }
  }

  const iconBtn =
    "touch-target focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors";

  return (
    <div
      ref={ref}
      className="relative flex items-center gap-0.5 border-l border-slate-200 pl-1.5 dark:border-slate-700"
    >
      <a
        href={blogHref(`/write/${postId}`)}
        aria-label={t("ownerEdit")}
        title={t("ownerEdit")}
        className={`${iconBtn} hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200`}
      >
        <Pencil className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={() => setConfirming((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={confirming}
        aria-label={t("ownerDelete")}
        title={t("ownerDelete")}
        className={`${iconBtn} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400`}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("ownerDeleteConfirm")}
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("ownerDeleteConfirm")}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t("ownerDeleteConfirmBody")}
          </p>
          {error && (
            <p role="status" className="mt-2 text-[13px] text-red-600 dark:text-red-400">
              {t("ownerDeleteError")}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="focus-ring rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {tc("cancel")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("ownerDelete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
