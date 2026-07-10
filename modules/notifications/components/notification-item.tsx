"use client";

import type { ComponentType } from "react";
import { AtSign, Heart, MessageCircle, PenLine, Reply, Rss, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
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

// 아바타 우하단의 종류 글리프 — 글만으로는 좋아요/댓글/팔로우 행이 전부 같은 얼굴이라,
// 스캔할 때 "무슨 일"인지부터 읽히게 한다.
const TYPE_ICON: Record<Item["type"], ComponentType<{ className?: string }>> = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  REPLY: Reply,
  FOLLOW: UserPlus,
  SERIES_SUBSCRIBE: Rss,
  NEW_POST: PenLine,
  MENTION: AtSign,
};

/**
 * One notification row, shared by the desktop dropdown and the full page (`roomy`). Deep-links by
 * type: to the post (LIKE/COMMENT on the recipient's own post; REPLY/NEW_POST via the carried/actor
 * author handle), to the actor's blog (FOLLOW), or to the recipient's own series (SERIES_SUBSCRIBE).
 * Clicking marks it read.
 *
 * Unread 신호 = 그린 점 + 본문 톤 강조. 예전의 행 전체 accent 면 채움은 페이지에서 초록 띠가
 * 줄줄이 쌓여(그린 월) 폐기 — 그린은 점 하나로만 말한다(§10.3).
 */
export function NotificationItem({
  item,
  onNavigate,
  roomy = false,
}: {
  item: Item;
  onNavigate?: () => void;
  /** 전체 알림 페이지의 여유 행 — 드롭다운(기본)보다 패딩·서브타이틀이 한 단계 큼. */
  roomy?: boolean;
}) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { me } = useAuth();
  const relative = useRelativeTime();
  const markRead = useMarkRead();

  const actor = item.actorUsername ?? t("someone");
  // 행위자 이름/아바타는 그 사람 프로필로 가는 섬 링크 — 행의 기본 액션(글/시리즈)과 별개.
  const actorHref = item.actorUsername ? authorHref(item.actorUsername, locale) : undefined;
  // 행위자만 굵게(<b> 태그는 메시지 파일에) — 문장 전체가 같은 무게면 누가/무엇이 안 잡힌다.
  // 이름 자체가 프로필 링크(있을 때) — pointer-events 를 되살려 행 오버레이 위로.
  const message = t.rich(MESSAGE_KEY[item.type], {
    actor,
    b: (chunks) =>
      actorHref ? (
        <BlogLink
          href={actorHref}
          onClick={handleClick}
          className="focus-ring pointer-events-auto rounded font-semibold text-slate-900 transition-colors hover:text-accent-700 hover:underline dark:text-slate-100 dark:hover:text-accent-400"
        >
          {chunks}
        </BlogLink>
      ) : (
        <b className="font-semibold text-slate-900 dark:text-slate-100">{chunks}</b>
      ),
  });
  const subtitle = item.type === "SERIES_SUBSCRIBE" ? item.seriesTitle : item.postTitle;
  const TypeIcon = TYPE_ICON[item.type];

  const href = resolveHref(item, me?.username ?? null, locale);

  function handleClick() {
    if (!item.read) markRead.mutate(item.id);
    onNavigate?.();
  }

  const body = (
    <>
      <span className="relative shrink-0">
        {actorHref ? (
          <BlogLink
            href={actorHref}
            onClick={handleClick}
            aria-label={item.actorUsername ?? undefined}
            className="focus-ring pointer-events-auto block rounded-full"
          >
            <Avatar src={item.actorAvatarUrl} name={item.actorUsername ?? "?"} size="sm" />
          </BlogLink>
        ) : (
          <Avatar src={item.actorAvatarUrl} name={item.actorUsername ?? "?"} size="sm" />
        )}
        {!item.read && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-600 dark:border-slate-950"
          />
        )}
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        >
          <TypeIcon
            className={cn(
              "h-2.5 w-2.5",
              item.type === "LIKE" && "fill-current",
              item.read ? "text-slate-400 dark:text-slate-500" : "text-accent-600 dark:text-accent-400",
            )}
          />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block leading-snug",
            roomy ? "text-[14px]" : "text-[13px]",
            item.read ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-200",
          )}
        >
          {message}
        </span>
        {subtitle && (
          <span
            className={cn(
              "mt-0.5 block truncate",
              roomy ? "text-[13px]" : "text-[12px]",
              "text-slate-500 dark:text-slate-400",
            )}
          >
            {subtitle}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
          {relative(item.createdAt)}
        </span>
      </span>
    </>
  );

  const rowClass = cn(
    "relative block w-full rounded-lg text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
    roomy ? "px-2 py-3.5 rounded-xl" : "px-3 py-2.5",
  );

  // 행 전체의 기본 액션(타입별 타깃)은 내용 밑에 깔리는 스트레치 링크 — 아바타·행위자 이름만
  // pointer-events 를 되살려 프로필로 빠진다(중첩 앵커 금지 → 형제 오버레이 + 클릭 섬).
  return (
    <div className={rowClass}>
      {href ? (
        <BlogLink
          href={href}
          onClick={handleClick}
          aria-label={subtitle || actor}
          className="focus-ring absolute inset-0 rounded-lg"
        />
      ) : (
        <button
          type="button"
          onClick={handleClick}
          aria-label={subtitle || actor}
          className="focus-ring absolute inset-0 rounded-lg"
        />
      )}
      <div className="pointer-events-none relative flex items-start gap-3">{body}</div>
    </div>
  );
}
