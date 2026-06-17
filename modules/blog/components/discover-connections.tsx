"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CornerDownRight, Loader2 } from "lucide-react";
import { blogHref, blogPath } from "@/lib/host";
import { DATE_LOCALE } from "@/lib/date";
import { listDiscoverConnections, type ConnectionEvent } from "@/modules/blog/api/collections";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { ConnectionBlock, eventBlock } from "@/modules/blog/components/connection-block";
import { SuggestedCurators } from "@/modules/blog/components/suggested-curators";
import { blogCta } from "@/modules/blog/components/blog-cta";

/**
 * Discovery — the curator-connection flow ("who connected what, to which collection, why"). This is
 * the connection graph's discovery surface: you follow curation, not a broadcast. PATH-kind
 * collections are marked "길". A cold start (following nobody) routes to finding writers, not a dead end.
 */
export function DiscoverConnections({ locale }: { locale: string }) {
  const t = useTranslations("collections");
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    listDiscoverConnections()
      .then((feed) => {
        if (!alive) return;
        setEvents(feed.items);
        setState("ready");
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (state === "failed") {
    return (
      <p className="py-20 text-center text-[14px] text-slate-500 dark:text-slate-400">
        {t("discoverFailed")}
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
          {t("discoverEmptyTitle")}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("discoverEmptyBody")}
        </p>
        <a href={blogHref("/")} className={`mt-6 inline-block ${blogCta({ variant: "secondary" })}`}>
          {t("discoverEmptyCta")}
        </a>
        {/* The connection graph is empty until you follow someone — hand the new reader curators to
            follow so this core surface isn't a day-1 dead-end. */}
        <div className="mt-10">
          <SuggestedCurators locale={locale} />
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {events.map((event) => (
        <li key={event.id} className="py-6 first:pt-0">
          <ConnectionEventCard event={event} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

function ConnectionEventCard({ event, locale }: { event: ConnectionEvent; locale: string }) {
  const t = useTranslations("collections");
  const uiLocale = useLocale();
  const isPath = event.collectionKind === "PATH";

  return (
    <article>
      {/* Attribution, quiet — who, when. */}
      <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
        {/* Curator → their home: the "discover who curates, then follow" step of the loop. */}
        <BlogLink
          href={authorHref(event.curator.username, locale)}
          className="focus-ring group inline-flex items-center gap-2 rounded"
        >
          <Avatar src={event.curator.avatarUrl} name={event.curator.username} size="xs" />
          <span className="font-medium text-slate-700 transition-colors group-hover:text-accent-700 dark:text-slate-300 dark:group-hover:text-accent-400">
            @{event.curator.username}
          </span>
        </BlogLink>
        {event.connectedAt && (
          <>
            <span aria-hidden>·</span>
            <time dateTime={event.connectedAt}>{formatDate(event.connectedAt, uiLocale)}</time>
          </>
        )}
      </div>

      {/* The collection chip — the verb "connected to …", a tap-through to the channel. */}
      <BlogLink
        href={blogPath(`/collections/${event.collectionId}`)}
        className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded text-[12px] font-bold uppercase tracking-wide text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
      >
        {isPath && <CornerDownRight className="h-3 w-3" />}
        <span>{event.collectionTitle}</span>
        <span className="font-medium normal-case tracking-normal text-slate-400 dark:text-slate-500">
          {isPath ? t("connectedToPath") : t("connectedTo")}
        </span>
      </BlogLink>

      {/* The curator's line — the hero, the clearest signal this is human curation, not an algorithm. */}
      {event.why && (
        <p className="mt-2.5 text-[16px] font-medium leading-relaxed text-slate-900 dark:text-slate-100">
          {event.why}
        </p>
      )}

      <div className="mt-3">
        <ConnectionBlock block={eventBlock(event)} locale={locale} />
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
