"use client";

import { useTranslations } from "next-intl";
import { Eye, Trash2 } from "lucide-react";
import type { PostView } from "@/modules/blog/api/posts";
import { PostStatusBadge } from "@/modules/blog/components/post-status-badge";

export function PostRow({ post, onDelete }: { post: PostView; onDelete?: (post: PostView) => void }) {
  const t = useTranslations("blogWorkspace");
  // The whole row links to the editor, so the delete control is a sibling of the <a> (not nested —
  // a button inside an anchor is invalid + un-clickable). Shown on hover / focus-within.
  return (
    <li className="group/row -mx-3 flex items-center rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <a
        href={`/write/${post.id}`}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3"
      >
        <PostStatusBadge status={post.status} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-slate-900 group-hover/row:text-accent-700 dark:text-slate-100 dark:group-hover/row:text-accent-400">
            {post.title || post.slug}
          </span>
          <span className="block truncate font-mono text-[12px] text-slate-400 dark:text-slate-500">/{post.slug}</span>
        </span>
        {post.status === "PUBLISHED" && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-slate-400 dark:text-slate-500">
            <Eye className="h-3.5 w-3.5" />
            {t("views", { count: post.viewCount })}
          </span>
        )}
      </a>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(post)}
          aria-label={t("rowDelete")}
          title={t("rowDelete")}
          className="focus-ring mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover/row:opacity-100 dark:text-slate-500 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
