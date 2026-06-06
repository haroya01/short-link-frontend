"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { useRelativeTime } from "@/modules/notifications/lib/relative-time";
import { useMarkRead } from "@/modules/notifications/lib/use-notifications";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";
import { cn } from "@/lib/utils";

const VERB: Record<Item["type"], "like" | "comment" | "follow"> = {
  LIKE: "like",
  COMMENT: "comment",
  FOLLOW: "follow",
};

/**
 * One notification row, shared by the desktop dropdown and the full page. Links to the post (like /
 * comment — the recipient's own post) or the actor's blog (follow). Clicking marks it read. The
 * leading dot marks unread; a faint accent wash reinforces it for the whole row.
 */
export function NotificationItem({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { me } = useAuth();
  const relative = useRelativeTime();
  const markRead = useMarkRead();

  const actor = item.actorUsername ?? t("someone");
  const message = t(VERB[item.type], { actor });

  const href =
    item.type === "FOLLOW"
      ? item.actorUsername
        ? authorHref(item.actorUsername, locale)
        : undefined
      : item.postSlug && me?.username
        ? postHref(me.username, item.postSlug, locale)
        : undefined;

  function handleClick() {
    if (!item.read) markRead.mutate(item.id);
    onNavigate?.();
  }

  const body = (
    <>
      <span className="relative shrink-0">
        <Avatar src={item.actorAvatarUrl} name={item.actorUsername ?? "?"} size="sm" />
        {!item.read && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-600 dark:border-slate-950"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-snug text-slate-700 dark:text-slate-200">
          {message}
        </span>
        {item.postTitle && (
          <span className="mt-0.5 block truncate text-[12px] text-slate-400 dark:text-slate-500">
            {item.postTitle}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
          {relative(item.createdAt)}
        </span>
      </span>
    </>
  );

  const rowClass = cn(
    "focus-ring flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
    !item.read && "bg-accent-50/60 dark:bg-accent-500/5",
  );

  if (!href) {
    return (
      <button type="button" onClick={handleClick} className={rowClass}>
        {body}
      </button>
    );
  }
  return (
    <a href={href} onClick={handleClick} className={rowClass}>
      {body}
    </a>
  );
}
