"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { CoverThumb } from "@/modules/blog/components/cover-thumb";
import { authorHref } from "@/modules/blog/lib/author-href";
import { useIsPostRead } from "@/modules/blog/lib/read-posts";

type DataAttrs = { [key: `data-${string}`]: string | number | boolean | undefined };

export function FeedRow({
  href,
  title,
  titleLang,
  excerpt,
  excerptLang,
  excerptIsBody = false,
  cover,
  eager = false,
  readId,
  top,
  byline,
  after,
  flushTop = false,
  className,
  style,
  linkData,
  rowData,
}: {
  href: string;
  title?: string | null;
  titleLang?: string;
  excerpt?: ReactNode;
  excerptLang?: string;
  excerptIsBody?: boolean;
  cover?: string | null;
  eager?: boolean;
  readId?: number | null;
  top?: ReactNode;
  byline: ReactNode;
  after?: ReactNode;
  flushTop?: boolean;
  className?: string;
  style?: CSSProperties;
  linkData?: DataAttrs;
  rowData?: DataAttrs;
}) {
  const t = useTranslations("publicFeed");
  const read = useIsPostRead(readId);

  return (
    <li
      className={cn(
        "group relative grid border-b border-slate-100 last:border-b-0 dark:border-slate-800",
        cover ? "grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 sm:grid-rows-[auto_auto_1fr_auto] sm:gap-x-4" : "grid-cols-1",
        flushTop ? "pb-4 pt-1.5" : "py-4",
        className,
      )}
      style={style}
      data-feed-row=""
      data-read={read ? "true" : undefined}
      {...rowData}
    >
      {top && (
        <div className="col-span-full row-start-1 mb-1.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-5 text-slate-500 dark:text-slate-400 sm:col-span-1">
          {top}
        </div>
      )}
      <BlogLink href={href} className="focus-ring col-start-1 row-start-2 block min-w-0 rounded" {...linkData}>
        {title && (
          <h2
            lang={titleLang}
            className={cn(
              "line-clamp-3 text-card-title-sm font-bold leading-[1.3] tracking-tight transition-colors duration-300 ease-[var(--ease)] group-hover:text-accent-700 dark:group-hover:text-accent-400",
              read ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100",
            )}
          >
            {title}
            {read && <span className="sr-only">{t("rowRead")}</span>}
          </h2>
        )}
        {excerpt && (
          <p
            lang={excerptLang}
            className={cn(
              "text-[14px] leading-relaxed",
              title && "mt-1.5",
              excerptIsBody
                ? "line-clamp-3 whitespace-pre-line break-words text-slate-800 transition-colors duration-300 ease-[var(--ease)] group-hover:text-accent-700 dark:text-slate-200 dark:group-hover:text-accent-400"
                : "line-clamp-2 text-slate-500 dark:text-slate-400",
            )}
          >
            {excerpt}
          </p>
        )}
      </BlogLink>
      {cover && (
        <BlogLink
          href={href}
          aria-hidden
          tabIndex={-1}
          data-row-thumb=""
          className="col-start-2 row-start-2 block h-[72px] w-[72px] self-start overflow-hidden rounded-inner bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-800 sm:row-span-3 sm:row-start-1 sm:h-24 sm:w-24"
          {...linkData}
        >
          <CoverThumb
            src={cover}
            sizes="(min-width: 640px) 96px, 72px"
            eager={eager}
            className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease)] group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        </BlogLink>
      )}
      <div className="col-span-full row-start-3 mt-2 flex min-h-5 min-w-0 items-center gap-1.5 self-start text-[12px] text-slate-500 dark:text-slate-400 sm:col-span-1">
        {byline}
      </div>
      {after && <div className="col-span-full row-start-4 min-w-0">{after}</div>}
    </li>
  );
}

export function RowAuthor({
  username,
  avatarUrl,
  locale,
}: {
  username: string;
  avatarUrl: string | null | undefined;
  locale: string;
}) {
  return (
    <BlogLink
      href={authorHref(username, locale)}
      className="focus-ring flex min-w-0 items-center gap-1.5 rounded transition-colors hover:text-slate-900 dark:hover:text-slate-100"
    >
      <Avatar src={avatarUrl} name={username} size="xs" />
      <span className="truncate font-medium">{username}</span>
    </BlogLink>
  );
}

export function RowDot() {
  return <span aria-hidden>·</span>;
}
