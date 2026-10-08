"use client";

import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { blogPath } from "@/lib/host";
import { DATE_LOCALE } from "@/lib/date";
import type { ConnectionEvent } from "@/modules/blog/api/collections";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/lib/author-href";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { quoteHref } from "@/modules/blog/components/connection-block";
import { RailHeading } from "@/modules/blog/components/rail-heading";

/**
 * A public connection event woven into the discovery feed — the "지금 이어지는 것들" thread. NOT a tile:
 * a quiet list row (bordered top+bottom by the surrounding {@link FeedInfinite} cell) so a connection
 * reads as something to *read*, not to scan — the same list rhythm as the authed 연결 발견 surface.
 *
 * The `lead` insert carries the section label (RailHeading, one green tick); later inserts are just the
 * row, so the thread names itself once rather than shouting on every card. Signed-out visitors see it
 * too — this is the graph's first-touch surface. `profile-fade` gives the row the same one-breath
 * stagger as the discovery feed (reduced-motion guarded in globals).
 */
export function ConnectionFeedInsert({
  event,
  locale,
  lead = false,
  idx = 0,
  label,
}: {
  event: ConnectionEvent;
  locale: string;
  /** First insert on the screen — shows the section label above the row. */
  lead?: boolean;
  /** Stagger index for the profile-fade entrance. */
  idx?: number;
  /** Localized "지금 이어지는 것들" — passed in (server-fetched i18n) so this stays a leaf. */
  label: string;
}) {
  return (
    <div
      className="profile-fade rounded-surface border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      style={{ "--idx": idx } as CSSProperties}
    >
      {lead && <RailHeading className="mb-2">{label}</RailHeading>}
      <ConnectionEventCard event={event} locale={locale} />
    </div>
  );
}

/** One connection event — 일반 글 카드 문법으로 수렴한 미니멀 카드(≤3층, 장식 아이콘 0). 연결된 글의
 *  제목이 카드의 주인공(중첩 박스·보더·아이콘 없이 본문에 직접), why 인용 한 줄, 맥락은 조용한 메타
 *  한 줄("@큐레이터가 컬렉션에 연결 · 날짜"). 발견 피드(이 파일)와 공개 피드 인서트("지금 이어지는
 *  것들")가 공유 — eyebrow 는 인서트의 lead 헤딩이 한 번만 이름을 밝힌다. */
export function ConnectionEventCard({ event, locale }: { event: ConnectionEvent; locale: string }) {
  const t = useTranslations("collections");
  const uiLocale = useLocale();

  // 연결된 것의 목적지 — 글/하이라이트는 그 글(하이라이트는 문장까지), 노트는 목적지 없음.
  const isPost = event.blockType === "POST" && event.slug && event.username;
  const isHighlight = event.blockType === "HIGHLIGHT" && event.slug && event.username;
  const heroHref = isHighlight
    ? quoteHref(event.username as string, event.slug as string, event.quote ?? "", locale)
    : isPost
      ? postHref(event.username as string, event.slug as string, locale)
      : null;
  // 주인공 텍스트: 글=제목, 하이라이트=칠한 구절, 노트=본문.
  const heroText =
    event.blockType === "HIGHLIGHT" ? event.quote : event.blockType === "NOTE" ? event.body : event.title;

  const isPath = event.collectionKind === "PATH";

  return (
    <article className="flex flex-col gap-2">
      {/* 주인공 — 연결된 글 제목(일반 카드 제목과 같은 급). 중첩 박스·아이콘 없이 본문에 직접. 하이라이트
          는 칠한 구절이 주인공이라 세로 스파인 인용으로(그건 콘텐츠라 유지), 노트는 본문 그대로. */}
      {heroText &&
        (isHighlight ? (
          <BlogLink href={heroHref as string} className="focus-ring group flex gap-2.5 rounded">
            <span aria-hidden className="mt-1 w-[3px] shrink-0 rounded-full bg-accent-600 dark:bg-accent-500" />
            <span className="text-card-title-xs font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
              {heroText}
            </span>
          </BlogLink>
        ) : heroHref ? (
          <BlogLink
            href={heroHref}
            className="focus-ring rounded text-card-title-xs font-semibold leading-snug tracking-tight text-slate-900 transition-colors hover:text-accent-700 dark:text-slate-100 dark:hover:text-accent-400"
          >
            {heroText}
          </BlogLink>
        ) : (
          <p className="text-card-title-xs font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
            {heroText}
          </p>
        ))}

      {/* why — 큐레이터의 한 줄(콘텐츠라 유지). 일반 카드의 소개글 자리. 스파인 없이 조용히. */}
      {event.why && (
        <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">{event.why}</p>
      )}

      {/* 맥락 한 줄 — 일반 카드 작가 행과 같은 결. 아바타 + "@큐레이터가 [컬렉션]에 연결 · 날짜".
          장식 아이콘 0. 큐레이터·컬렉션 이름은 링크로 t.rich 태그에 주입해 로케일별 어순을 지킨다
          (ko "…가 …에 연결" · en "… connected … into"). connectionMeta/connectionMetaPath 키. */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px] text-slate-500 dark:text-slate-400">
        <Avatar src={event.curator.avatarUrl} name={event.curator.username} size="xs" />
        <span className="min-w-0">
          {t.rich(isPath ? "connectionMetaPath" : "connectionMeta", {
            curator: (chunks) => (
              <BlogLink
                href={authorHref(event.curator.username, locale)}
                className="focus-ring rounded font-medium text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
              >
                {chunks}
              </BlogLink>
            ),
            collection: (chunks) => (
              <BlogLink
                href={blogPath(`/collections/${event.collectionId}`)}
                className="focus-ring rounded font-medium text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
              >
                {chunks}
              </BlogLink>
            ),
            curatorName: event.curator.username,
            collectionName: event.collectionTitle,
          })}
        </span>
        {event.connectedAt && (
          <>
            <span aria-hidden>·</span>
            <time dateTime={event.connectedAt} className="shrink-0">
              {formatDate(event.connectedAt, uiLocale)}
            </time>
          </>
        )}
      </div>
    </article>
  );
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}
