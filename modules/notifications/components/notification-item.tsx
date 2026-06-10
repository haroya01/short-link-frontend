"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { useRelativeTime } from "@/modules/notifications/lib/relative-time";
import { useMarkRead } from "@/modules/notifications/lib/use-notifications";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";
import { cn } from "@/lib/utils";

/**
 * Where a row navigates, by type. The recipient (`myUsername`) authors LIKE/COMMENT posts and owns
 * the subscribed series; REPLY carries the post owner's handle (the post may be someone else's);
 * NEW_POST's author is the actor. Returns undefined when the needed handle/slug is missing.
 */
function resolveHref(item: Item, myUsername: string | null, locale: string): string | undefined {
  switch (item.type) {
    case "FOLLOW":
      return item.actorUsername ? authorHref(item.actorUsername, locale) : undefined;
    case "SERIES_SUBSCRIBE":
      return item.seriesSlug && myUsername
        ? authorHref(myUsername, locale, `series/${item.seriesSlug}`)
        : undefined;
    case "NEW_POST":
      return item.postSlug && item.actorUsername
        ? postHref(item.actorUsername, item.postSlug, locale)
        : undefined;
    case "REPLY":
    case "MENTION":
      // The post may be someone else's — the owner's handle rides in the payload.
      return item.postSlug && item.postAuthorUsername
        ? postHref(item.postAuthorUsername, item.postSlug, locale)
        : undefined;
    default: // LIKE / COMMENT — the recipient is the post's author
      return item.postSlug && myUsername
        ? postHref(myUsername, item.postSlug, locale)
        : undefined;
  }
}

const MESSAGE_KEY: Record<Item["type"], string> = {
  LIKE: "like",
  COMMENT: "comment",
  FOLLOW: "follow",
  SERIES_SUBSCRIBE: "series_subscribe",
  REPLY: "reply",
  NEW_POST: "new_post",
  MENTION: "mention",
};

/**
 * One notification row, shared by the desktop dropdown and the full page. Deep-links by type: to the
 * post (LIKE/COMMENT on the recipient's own post; REPLY/NEW_POST via the carried/actor author
 * handle), to the actor's blog (FOLLOW), or to the recipient's own series (SERIES_SUBSCRIBE).
 * Clicking marks it read. The leading dot marks unread; a faint accent wash reinforces it.
 */
export function NotificationItem({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { me } = useAuth();
  const relative = useRelativeTime();
  const markRead = useMarkRead();

  const actor = item.actorUsername ?? t("someone");
  const message = t(MESSAGE_KEY[item.type], { actor });
  const subtitle = item.type === "SERIES_SUBSCRIBE" ? item.seriesTitle : item.postTitle;

  const href = resolveHref(item, me?.username ?? null, locale);

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
        {subtitle && (
          <span className="mt-0.5 block truncate text-[12px] text-slate-500 dark:text-slate-400">
            {subtitle}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
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
