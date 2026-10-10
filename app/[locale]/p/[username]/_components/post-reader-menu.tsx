"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { deletePost } from "@/modules/blog/api/posts";
import { ACTION_ICON, actionIconButton } from "@/modules/blog/components/action-icon-button";
import { authorHref } from "@/modules/blog/lib/author-href";
import { buildAuthorShareUrl } from "@/modules/blog/lib/publishing-share";
import { useQuoteInNote } from "@/modules/notes/components/quote-in-note-button";
import { ReportButton } from "@/modules/blog/components/report-button";
import { useBlockAuthor } from "@/modules/notes/components/use-block-author";

/**
 * The post's ⋯, in the header and at the end of the post. The owner's 수정 · 삭제 come first; then 공유
 * (below 1100px, where the action row gives way to the dock), 노트로 인용, and for someone else's post
 * 차단 · 신고, as on iOS. Blocking needs an account; reporting doesn't. 삭제 asks first, then goes to the
 * author's home with a full navigation, so no client cache keeps the deleted post.
 */
export function PostReaderMenu({
  postId,
  authorUsername,
  postTitle,
  postSlug,
  postUrl,
  locale,
}: {
  postId: number;
  authorUsername: string;
  postTitle: string;
  postSlug: string;
  postUrl: string;
  locale: string;
}) {
  const t = useTranslations("notes");
  const tp = useTranslations("publicPost");
  const ts = useTranslations("share");
  const { ready, authenticated, me } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const { blocked, block, unblock, confirmDialog } = useBlockAuthor(authorUsername);
  const quote = useQuoteInNote({ postId, title: postTitle, slug: postSlug, authorUsername });
  const [confirm, deleteDialog] = useConfirm();

  if (!ready) return null;
  const own = me?.username === authorUsername;

  async function share() {
    setOpen(false);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: postTitle, url: postUrl });
      } catch {}
      return;
    }
    const url = buildAuthorShareUrl(postUrl, postSlug, "copy");
    try {
      await navigator.clipboard.writeText(url);
      toast(t("linkCopied"));
    } catch {
      window.prompt(ts("copiedFallback"), url);
    }
  }

  async function remove() {
    setOpen(false);
    const ok = await confirm({
      title: tp("ownerDeleteConfirm"),
      description: tp("ownerDeleteConfirmBody"),
      confirmLabel: tp("ownerDelete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePost(postId);
      window.location.href = authorHref(authorUsername, locale);
    } catch {
      toast(tp("ownerDeleteError"));
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("postMenu")}
        title={t("postMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={actionIconButton()}
      >
        <MoreHorizontal className={ACTION_ICON} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-44 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {own && (
            <div data-owner-section className="mb-1 border-b border-slate-100 pb-1 dark:border-slate-800">
              <a role="menuitem" href={blogHref(`/write/${postId}`)} className={item}>
                {tp("ownerEdit")}
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => void remove()}
                className={cn(item, "text-red-600 dark:text-red-400")}
              >
                {tp("ownerDelete")}
              </button>
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => void share()}
            className={cn(item, "min-[1100px]:hidden")}
          >
            {ts("label")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              quote.start();
            }}
            className={item}
          >
            {t("quoteAction")}
          </button>
          {authenticated && !own && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void (blocked ? unblock() : block());
              }}
              className={cn(item, !blocked && "text-red-600 dark:text-red-400")}
            >
              {blocked ? t("unblock") : t("blockMenu")}
            </button>
          )}
          {!own && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setReporting(true);
              }}
              className={item}
            >
              {tp("report")}
            </button>
          )}
        </div>
      )}
      {!own && <ReportButton subjectType="POST" subjectId={postId} open={reporting} onOpenChange={setReporting} />}
      {confirmDialog}
      {deleteDialog}
      {quote.dialog}
    </div>
  );
}

const item =
  "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
