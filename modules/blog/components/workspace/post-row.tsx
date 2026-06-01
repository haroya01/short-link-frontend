"use client";

import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import type { PostStatus, PostView } from "@/modules/blog/api/posts";

const TONE: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-sky-100 text-sky-700",
  PUBLISHED: "bg-accent-100 text-accent-700",
  UNPUBLISHED: "bg-amber-100 text-amber-700",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  const t = useTranslations("postEditor");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[status]}`}>
      {t(`status${status}`)}
    </span>
  );
}

export function PostRow({ post }: { post: PostView }) {
  const t = useTranslations("blogWorkspace");
  return (
    <li>
      <a
        href={`/write/${post.id}`}
        className="focus-ring group -mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
      >
        <StatusBadge status={post.status} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-slate-900 group-hover:text-accent-700">
            {post.title || post.slug}
          </span>
          <span className="block truncate font-mono text-[12px] text-slate-400">/{post.slug}</span>
        </span>
        {post.status === "PUBLISHED" && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-slate-400">
            <Eye className="h-3.5 w-3.5" />
            {t("views", { count: post.viewCount })}
          </span>
        )}
      </a>
    </li>
  );
}
