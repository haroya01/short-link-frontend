"use client";

import type { ReactNode } from "react";
import { Heart, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";

type Person = { username: string; displayName?: string | null; avatarUrl?: string | null } | null;

export function ConversationName({ name, handle }: { name?: string | null; handle: string }) {
  if (!name) {
    return <span className="min-w-0 truncate font-semibold text-slate-900 dark:text-slate-100">@{handle}</span>;
  }
  return (
    <>
      <span className="max-w-[70%] shrink-0 truncate font-semibold text-slate-900 dark:text-slate-100">{name}</span>
      <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">@{handle}</span>
    </>
  );
}

export function ConversationLike({
  liked,
  count,
  label,
  onToggle,
}: {
  liked: boolean;
  count: number;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={label}
      className={cn(
        "touch-target inline-flex items-center gap-1 rounded text-[13px] tabular-nums transition-colors focus-ring",
        liked
          ? "text-accent-700 dark:text-accent-400"
          : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400",
      )}
    >
      <span key={liked ? "on" : "off"} className="subscribe-pop inline-flex">
        <Heart aria-hidden className={cn("h-3.5 w-3.5", liked && "fill-accent-600 text-accent-600")} />
      </span>
      {count > 0 && <span data-testid="like-count">{count}</span>}
    </button>
  );
}

export function ConversationRow({
  id,
  author,
  createdAt,
  time,
  nested = false,
  flash = false,
  isNew = false,
  badge,
  menu,
  onDelete,
  deleteLabel,
  actions,
  children,
}: {
  id?: string;
  author: Person;
  createdAt: string;
  time: string;
  nested?: boolean;
  flash?: boolean;
  isNew?: boolean;
  badge?: ReactNode;
  menu?: ReactNode;
  onDelete?: () => void;
  deleteLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const locale = useLocale();
  const handle = author?.username ?? "?";
  const href = author?.username ? authorHref(author.username, locale) : null;
  return (
    <div
      id={id}
      data-conversation-row
      className={cn(
        "-mx-3 -my-2 flex scroll-mt-24 gap-3 rounded-surface px-3 py-2 transition-colors duration-700 motion-reduce:transition-none",
        flash && "bg-accent-50 dark:bg-accent-900/30",
        isNew && "comment-in",
      )}
    >
      {href ? (
        <BlogLink href={href} tabIndex={-1} aria-hidden className="shrink-0 self-start rounded-full">
          <Avatar src={author?.avatarUrl ?? null} name={handle} size={nested ? "sm" : "md"} shrink={false} />
        </BlogLink>
      ) : (
        <span aria-hidden className="shrink-0 self-start">
          <Avatar src={null} name={handle} size={nested ? "sm" : "md"} shrink={false} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-h-5 items-center gap-1.5 text-[14px] leading-5">
          {href ? (
            <BlogLink href={href} className="flex min-w-0 items-baseline gap-1 rounded focus-ring hover:underline">
              <ConversationName name={author?.displayName} handle={handle} />
            </BlogLink>
          ) : (
            <span className="flex min-w-0 items-baseline gap-1">
              <ConversationName name={null} handle={handle} />
            </span>
          )}
          <span aria-hidden className="shrink-0 text-slate-400 dark:text-slate-500">
            ·
          </span>
          <time dateTime={createdAt} suppressHydrationWarning className="shrink-0 text-slate-500 dark:text-slate-400">
            {time}
          </time>
          {badge}
          <div className="-my-2 ml-auto flex shrink-0 items-center gap-1">
            {menu}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={deleteLabel}
                className="touch-target rounded text-slate-500 transition-colors hover:text-red-600 focus-ring dark:text-slate-400 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>
        {children && <div className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>}
        {actions && <div className="mt-1.5 flex items-center gap-4">{actions}</div>}
      </div>
    </div>
  );
}

export function ConversationTombstone({ id, flash = false, label }: { id?: string; flash?: boolean; label: string }) {
  return (
    <div
      id={id}
      data-conversation-row
      data-tombstone
      className={cn(
        "-mx-3 -my-2 flex scroll-mt-24 items-center gap-3 rounded-surface px-3 py-2 transition-colors duration-700 motion-reduce:transition-none",
        flash && "bg-accent-50 dark:bg-accent-900/30",
      )}
    >
      <span aria-hidden className="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
      <p className="text-[14px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
