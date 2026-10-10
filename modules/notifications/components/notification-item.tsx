"use client";

import { Children, isValidElement, type ComponentType, type ReactNode } from "react";
import {
  AtSign,
  BellRing,
  ChartBar,
  GitBranch,
  Heart,
  Highlighter,
  Link2,
  Lock,
  MessageCircle,
  Pencil,
  PenLine,
  Quote,
  Repeat2,
  Reply,
  Rss,
  UserPlus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { notificationHref } from "@/modules/notifications/lib/notification-href";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import { requestOrigin, useMarkRead } from "@/modules/notifications/lib/use-notifications";
import { FollowRequestAnswer } from "@/modules/notifications/components/follow-request-answer";
import { blogPath } from "@/lib/host";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";
import { cn } from "@/lib/utils";

/** Flatten a (possibly nested) ReactNode to its text — used to derive a plain aria-label from a rich
 *  `t.rich` result whose tag handlers return raw strings. */
function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement(node)) return flattenText((node.props as { children?: ReactNode }).children);
  return "";
}

const MESSAGE_KEY: Record<Item["type"], string> = {
  LIKE: "like",
  COMMENT: "comment",
  FOLLOW: "follow",
  SERIES_SUBSCRIBE: "series_subscribe",
  REPLY: "reply",
  NEW_POST: "new_post",
  MENTION: "mention",
  CONNECTED: "connected",
  PATH_GREW: "path_grew",
  NOTE_LIKE: "note_like",
  NOTE_REPOST: "note_repost",
  NOTE_REPLY: "note_reply",
  NOTE_QUOTE: "note_quote",
  NOTE_MENTION: "note_mention",
  NOTE_POLL: "note_poll",
  NOTE_POST: "note_post",
  NOTE_EDIT: "note_edit",
  REMOTE_FOLLOW: "remote_follow",
  FOLLOW_REQUEST: "follow_request",
  POST_QUOTE: "post_quote",
  NOTE_EMBED: "note_embed",
  COMMENT_LIKE: "comment_like",
  HIGHLIGHT: "highlight",
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
  // 그래프 이벤트: 엮임 = 사슬 고리(Link2), 길에 새 글 = 가지가 뻗음(GitBranch).
  CONNECTED: Link2,
  PATH_GREW: GitBranch,
  NOTE_LIKE: Heart,
  NOTE_REPOST: Repeat2,
  NOTE_REPLY: Reply,
  NOTE_QUOTE: Quote,
  NOTE_MENTION: AtSign,
  NOTE_POLL: ChartBar,
  NOTE_POST: BellRing,
  NOTE_EDIT: Pencil,
  REMOTE_FOLLOW: UserPlus,
  FOLLOW_REQUEST: Lock,
  POST_QUOTE: Quote,
  NOTE_EMBED: Quote,
  COMMENT_LIKE: Heart,
  HIGHLIGHT: Highlighter,
};

function subtitleOf(item: Item): string | null {
  switch (item.type) {
    case "SERIES_SUBSCRIBE":
      return item.seriesTitle;
    case "NOTE_REPLY":
    case "NOTE_QUOTE":
      return item.sourceExcerpt ?? null;
    case "NOTE_LIKE":
    case "NOTE_REPOST":
    case "NOTE_MENTION":
    case "NOTE_POLL":
    case "NOTE_POST":
    case "NOTE_EDIT":
    case "POST_QUOTE":
      return item.noteExcerpt ?? null;
    default:
      return item.postTitle;
  }
}

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
  const relative = useCompactTime();
  const markRead = useMarkRead();

  const actor = item.actorUsername ?? t("someone");
  // 행위자 이름/아바타는 그 사람 프로필로 가는 섬 링크 — 행의 기본 액션(글/시리즈)과 별개.
  // 다른 서버 계정은 그 서버의 프로필을 새 탭으로 연다.
  // 이 서버가 아는 다른 서버 계정(actorRemoteId)은 앱 안의 그 계정 화면으로 간다.
  const remoteId = item.actorRemoteId ?? null;
  const remoteHref = remoteId == null ? (item.actorProfileUrl ?? undefined) : undefined;
  const actorHref =
    remoteId != null
      ? blogPath(`/remote/${remoteId}`)
      : !remoteHref && item.actorUsername
        ? authorHref(item.actorUsername, locale)
        : undefined;
  const origin = item.type === "FOLLOW_REQUEST" ? requestOrigin(item) : null;
  const others = Math.max((item.count ?? 1) - 1, 0);
  const messageKey =
    item.type === "NOTE_POLL" && item.actorUsername === me?.username
      ? "note_poll_mine"
      : others > 0
        ? `${MESSAGE_KEY[item.type]}_group`
        : MESSAGE_KEY[item.type];
  // 행위자만 굵게(<b> 태그는 메시지 파일에) — 문장 전체가 같은 무게면 누가/무엇이 안 잡힌다.
  // 이름 자체가 프로필 링크(있을 때) — pointer-events 를 되살려 행 오버레이 위로.
  // 컬렉션 이름은 그래프 이벤트 문장에서 강조어(<c>{collection}</c>) — 없으면 안전한 폴백 라벨.
  const collection = item.collectionName ?? t("aCollection");
  const message = t.rich(messageKey, {
    actor,
    collection,
    others,
    b: (chunks) =>
      remoteHref ? (
        <a
          href={remoteHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="focus-ring pointer-events-auto rounded font-semibold text-slate-900 transition-colors hover:text-accent-700 hover:underline dark:text-slate-100 dark:hover:text-accent-400"
        >
          {chunks}
        </a>
      ) : actorHref ? (
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
    c: (chunks) => <b className="font-semibold text-slate-900 dark:text-slate-100">{chunks}</b>,
  });
  const subtitle = subtitleOf(item);
  // Plain-text twin of the rich `message` for the row's aria-label (a ReactNode can't be a label). The
  // `<b>` handler returns the actor string as-is, so the whole `t.rich` result is plain strings we join.
  const messageText = flattenText(
    t.rich(messageKey, {
      actor,
      collection,
      others,
      b: (chunks) => chunks,
      c: (chunks) => chunks,
    }),
  );
  const rowLabel = subtitle ? `${messageText}, ${subtitle}` : messageText;
  const TypeIcon = TYPE_ICON[item.type];

  const href = notificationHref(item, me?.username ?? null, locale);
  const externalHref = !href && item.type === "REMOTE_FOLLOW" ? remoteHref : undefined;

  function handleClick() {
    if (!item.read) markRead.mutate(item.id);
    onNavigate?.();
  }

  const body = (
    <>
      <span className="relative shrink-0">
        {remoteHref ? (
          <a
            href={remoteHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            aria-label={item.actorUsername ?? undefined}
            className="focus-ring pointer-events-auto block rounded-full"
          >
            <Avatar src={item.actorAvatarUrl} name={item.actorUsername ?? "?"} size="sm" />
          </a>
        ) : actorHref ? (
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
              (item.type === "LIKE" || item.type === "NOTE_LIKE" || item.type === "COMMENT_LIKE") && "fill-current",
              item.read ? "text-slate-400 dark:text-slate-400" : "text-accent-600 dark:text-accent-400",
            )}
          />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block leading-snug",
            roomy ? "text-[14px]" : "text-[13px]",
            item.read ? "text-slate-500 dark:text-slate-400" : "font-medium text-slate-800 dark:text-slate-100",
          )}
        >
          {!item.read && <span className="sr-only">{t("unreadLabel")}: </span>}
          {message}
        </span>
        {subtitle && (
          <span
            lang={contentLang(subtitle)}
            className={cn(
              "mt-0.5 block truncate",
              roomy ? "text-[13px]" : "text-[12px]",
              "text-slate-500 dark:text-slate-400",
            )}
          >
            {subtitle}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
          {relative(item.createdAt)}
        </span>
        {origin && <FollowRequestAnswer origin={origin} name={actor} className="mt-2" />}
      </span>
    </>
  );

  const rowClass = cn(
    "relative block w-full rounded-lg text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
    roomy ? "px-2 py-3.5" : "px-3 py-2.5",
  );

  // 행 전체의 기본 액션(타입별 타깃)은 내용 밑에 깔리는 스트레치 링크 — 아바타·행위자 이름만
  // pointer-events 를 되살려 프로필로 빠진다(중첩 앵커 금지 → 형제 오버레이 + 클릭 섬).
  return (
    <div className={rowClass}>
      {href ? (
        <BlogLink
          href={href}
          onClick={handleClick}
          aria-label={rowLabel}
          className="focus-ring absolute inset-0 rounded-lg"
        />
      ) : externalHref ? (
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          aria-label={rowLabel}
          className="focus-ring absolute inset-0 rounded-lg"
        />
      ) : (
        <button
          type="button"
          onClick={handleClick}
          aria-label={rowLabel}
          className="focus-ring absolute inset-0 rounded-lg"
        />
      )}
      <div className="pointer-events-none relative flex items-start gap-3">{body}</div>
    </div>
  );
}
