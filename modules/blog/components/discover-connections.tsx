"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CornerDownRight, Layers } from "lucide-react";
import { blogHref, blogPath } from "@/lib/host";
import { DATE_LOCALE } from "@/lib/date";
import { estimateMinutesForCount } from "@/lib/path-progress";
import {
  listDiscoverConnections,
  listPublicCollectionsByUsername,
  type CollectionSummary,
  type ConnectionEvent,
  type FeedSource,
  type KindredCurator,
} from "@/modules/blog/api/collections";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { quoteHref } from "@/modules/blog/components/connection-block";
import { HighlightsFeed } from "@/modules/blog/components/highlights-feed";
import { KindredCurators } from "@/modules/blog/components/kindred-curators";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { SuggestedCurators } from "@/modules/blog/components/suggested-curators";
import { blogCta } from "@/modules/blog/components/blog-cta";

type DiscoverTab = "entrances" | "recent" | "highlights";

/**
 * Discovery — reframed from a chronological activity log into a collection of *entrances*. You don't
 * scroll a "who did what when" stream; you pick a way in — an open path/collection or a kindred
 * curator — and then travel the edges. The praised time-ordered flow is preserved verbatim under the
 * "recent" tab (no regression), one tab over from the entrance-first default.
 *
 * Zero new backend: both the entrances and the timeline derive from the one feed the surface already
 * fetches. The open paths are resolved by asking each curator in the feed for their public collections
 * (`listPublicCollectionsByUsername`, an existing public read) so the row can show real size ("N편 ·
 * 약 M분"); a cold start (following nobody) still routes to finding writers, not a dead end.
 */
export function DiscoverConnections({ locale }: { locale: string }) {
  const t = useTranslations("collections");
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [entrances, setEntrances] = useState<Entrance[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [tab, setTab] = useState<DiscoverTab>("entrances");
  // 콜드스타트 폴백 — 팔로우가 없으면 백엔드가 전역 연결 흐름을 내리고 source:"global" 로 알린다. 이 표면은
  // 단일 페치라 scope 고정은 필요 없고(페이지네이션 없음), 전역임을 조용히 알리는 캡션만 붙인다. 구 서버는
  // source 부재(undefined) → 캡션 없음(기존 동작).
  const [source, setSource] = useState<FeedSource | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    listDiscoverConnections()
      .then(async (feed) => {
        if (!alive) return;
        setEvents(feed.items);
        setSource(feed.source);
        setState("ready");
        // Resolve the open paths behind the feed: each distinct curator's public collections, matched
        // to the collections they connected into here. Best-effort — a failed lookup just drops that
        // curator's entrances, never the whole view.
        const resolved = await resolveEntrances(feed.items);
        if (alive) setEntrances(resolved);
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, []);

  // The kindred curators surfaced up top — the people weaving the paths in this feed, deduped, most
  // active first. Reuses the KindredCurators component (which renders nothing when empty).
  const curators = useMemo<KindredCurator[]>(() => deriveCurators(events), [events]);

  // The tab strip always renders — the highlights tab is its own follow-graph surface that must be
  // reachable even when the connection feed is empty/failed, so the connection feed's loading/failed/
  // empty states live INSIDE the 입구/최근 views (below), not as a top-level gate over all three tabs.
  return (
    <div>
      <DiscoverTabs
        tab={tab}
        onChange={setTab}
        entrancesLabel={t("discoverTabEntrances")}
        recentLabel={t("discoverTabRecent")}
        highlightsLabel={t("discoverTabHighlights")}
      />
      <div className="mt-6">
        {tab === "highlights" ? (
          <HighlightsFeed locale={locale} onFindWriters={() => setTab("entrances")} />
        ) : state === "loading" ? (
          <ConnectionFeedSkeleton />
        ) : state === "failed" ? (
          <p className="py-20 text-center text-[14px] text-slate-500 dark:text-slate-400">
            {t("discoverFailed")}
          </p>
        ) : events.length === 0 ? (
          <ConnectionFeedEmpty locale={locale} />
        ) : (
          <>
            {/* 콜드스타트 폴백 안내 — 팔로우가 없어 전역 연결 흐름을 보여줄 때, 내 팔로우 그래프가 아니라
                전역 흐름임을 조용히 한 줄로 알린다(§10: 배지·색 없이 muted 한 줄). 팔로잉이면 없음. */}
            {source === "global" && (
              <p className="mb-5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t("discoverGlobalFallback")}
              </p>
            )}
            {tab === "entrances" ? (
              <EntrancesView entrances={entrances} curators={curators} locale={locale} />
            ) : (
              <RecentTimeline events={events} locale={locale} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The connection graph is empty until you follow someone — hand the new reader curators to follow so
 *  this core surface isn't a day-1 dead-end (shared by the 입구/최근 views, which read the same feed). */
function ConnectionFeedEmpty({ locale }: { locale: string }) {
  const t = useTranslations("collections");
  return (
    <div className="pb-16 pt-6 text-center">
      <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
        {t("discoverEmptyTitle")}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("discoverEmptyBody")}
      </p>
      <a href={blogHref("/")} className={`mt-6 inline-block ${blogCta({ variant: "secondary" })}`}>
        {t("discoverEmptyCta")}
      </a>
      <div className="mt-10">
        <SuggestedCurators locale={locale} />
      </div>
    </div>
  );
}

/** Entrance-first default — "지금 열려 있는 길" (open paths/collections) + "취향이 겹치는 큐레이터". Both
 *  are ways *in*; the reader picks one and then follows the edges. Falls back to the timeline's own
 *  content by never blocking the recent tab — if nothing resolves yet, the curators alone still read. */
function EntrancesView({
  entrances,
  curators,
  locale,
}: {
  entrances: Entrance[];
  curators: KindredCurator[];
  locale: string;
}) {
  const t = useTranslations("collections");
  return (
    <div>
      {entrances.length > 0 && (
        <section>
          <RailHeading>{t("discoverEntrancesTitle")}</RailHeading>
          <ul className="mt-3 space-y-2.5">
            {entrances.map((e, i) => (
              <li key={e.id} className="profile-fade" style={{ "--idx": i } as CSSProperties}>
                <EntranceRow entrance={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Kindred curators — reused as-is; renders nothing when there's no overlap, so no empty noise. */}
      <KindredCurators
        curators={curators}
        locale={locale}
        title={t("kindredCuratorsTitle")}
        sharedLabel={(count) => t("sharedItems", { count })}
      />
    </div>
  );
}

/** One entrance row — glyph (길 vs 컬렉션) + title + "@curator · N편 · 약 M분". A quiet hairline card that
 *  taps through to the collection/path (the reading destination), matching the entrance mockup. */
function EntranceRow({ entrance }: { entrance: Entrance }) {
  const t = useTranslations("collections");
  const isPath = entrance.kind === "PATH";
  const Glyph = isPath ? CornerDownRight : Layers;
  return (
    <BlogLink
      href={blogPath(`/collections/${entrance.id}`)}
      className="focus-ring group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400">
        <Glyph className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-slate-900 transition-colors group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
          {entrance.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">
          @{entrance.curatorUsername}
          <span aria-hidden> · </span>
          {t("discoverEntrancePieces", { count: entrance.count })}
          <span aria-hidden> · </span>
          {t("pathReadTime", { minutes: estimateMinutesForCount(entrance.count) })}
        </span>
      </span>
    </BlogLink>
  );
}

/** The praised chronological flow, preserved verbatim under the "recent" tab — the connection cards
 *  cascade in (rise+fade, 50ms apart) via profile-fade + --idx (reduced-motion handled in globals). */
function RecentTimeline({ events, locale }: { events: ConnectionEvent[]; locale: string }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {events.map((event, i) => (
        <li
          key={event.id}
          className="profile-fade py-6 first:pt-0"
          style={{ "--idx": i } as CSSProperties}
        >
          <ConnectionEventCard event={event} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

/** Entrance / recent / highlights tab strip — local-state segments (no server round-trip; the first two
 *  datasets are already in hand, the highlights tab fetches on first select), the quiet accent-underline
 *  idiom shared with the followers/following dialog. */
function DiscoverTabs({
  tab,
  onChange,
  entrancesLabel,
  recentLabel,
  highlightsLabel,
}: {
  tab: DiscoverTab;
  onChange: (t: DiscoverTab) => void;
  entrancesLabel: string;
  recentLabel: string;
  highlightsLabel: string;
}) {
  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800">
      <TabButton active={tab === "entrances"} onClick={() => onChange("entrances")}>
        {entrancesLabel}
      </TabButton>
      <TabButton active={tab === "recent"} onClick={() => onChange("recent")}>
        {recentLabel}
      </TabButton>
      <TabButton active={tab === "highlights"} onClick={() => onChange("highlights")}>
        {highlightsLabel}
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`focus-ring px-2.5 py-1.5 text-[15px] font-bold transition-colors ${
        active
          ? "text-accent-700 dark:text-accent-400"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      }`}
    >
      <span className="relative inline-block pb-2">
        {children}
        {active && (
          <span className="absolute inset-x-0 -bottom-[9px] h-0.5 rounded-full bg-accent-600 dark:bg-accent-400" />
        )}
      </span>
    </button>
  );
}

/** Loading placeholder — three rows echoing the connection card's rhythm (curator meta → collection
 *  chip → the curator's line → block) so the swap to real content is a settle, not a pop. Mirrors the
 *  divide-y list, matching the feed's skeleton idiom rather than a lone spinner. */
function ConnectionFeedSkeleton() {
  return (
    <ul aria-hidden className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800">
      {[0, 1, 2].map((i) => (
        <li key={i} className="py-6 first:pt-0">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <span className="mt-2.5 block h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <span className="mt-3 block h-4 w-4/5 rounded bg-slate-200/90 dark:bg-slate-800/90" />
          <div className="mt-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <span className="block h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <span className="mt-2 block h-3 w-1/2 rounded bg-slate-200/80 dark:bg-slate-800/80" />
          </div>
        </li>
      ))}
    </ul>
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

/** A resolved open path/collection — a way into the graph, with the real size behind it. */
interface Entrance {
  id: number;
  title: string;
  kind: CollectionSummary["kind"];
  count: number;
  curatorUsername: string;
}

/** The curators weaving the paths in this feed, deduped, most active first — shaped for KindredCurators.
 *  `sharedItems` = how many blocks they connected across this feed (their weight in it). */
function deriveCurators(events: ConnectionEvent[]): KindredCurator[] {
  const byId = new Map<number, { curator: ConnectionEvent["curator"]; count: number }>();
  for (const e of events) {
    const prev = byId.get(e.curator.id);
    if (prev) prev.count += 1;
    else byId.set(e.curator.id, { curator: e.curator, count: 1 });
  }
  return [...byId.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ curator, count }) => ({ curator, sharedItems: count }));
}

/** Resolve the feed's collections to real entrances. For each distinct curator, fetch their public
 *  collections once and keep the ones they actually connected into here (so the row shows the real
 *  size). Paths lead (the design leads with "길"), then collections; most-connected first. */
async function resolveEntrances(events: ConnectionEvent[]): Promise<Entrance[]> {
  // collectionId → the curator username seen connecting into it, and how often it appears in the feed.
  const wanted = new Map<number, { curator: string; weight: number }>();
  const curatorUsernames = new Set<string>();
  for (const e of events) {
    curatorUsernames.add(e.curator.username);
    const prev = wanted.get(e.collectionId);
    if (prev) prev.weight += 1;
    else wanted.set(e.collectionId, { curator: e.curator.username, weight: 1 });
  }

  // One public-collections lookup per distinct curator (a handful), in parallel; failures drop out.
  const lists = await Promise.all(
    [...curatorUsernames].map((u) =>
      listPublicCollectionsByUsername(u).catch(() => [] as CollectionSummary[]),
    ),
  );
  const summaryById = new Map<number, CollectionSummary>();
  for (const list of lists) for (const c of list) if (!summaryById.has(c.id)) summaryById.set(c.id, c);

  const out: (Entrance & { weight: number })[] = [];
  for (const [id, { curator, weight }] of wanted) {
    const s = summaryById.get(id);
    if (!s) continue; // not resolvable to a real public collection — skip rather than fabricate size
    out.push({ id, title: s.title, kind: s.kind, count: s.count, curatorUsername: curator, weight });
  }
  // Paths first (the design leads with "길"), then by feed weight (how present the collection is right
  // now), then by size. Drop the weight before returning the clean entrances.
  out.sort((a, b) => {
    const ap = a.kind === "PATH" ? 0 : 1;
    const bp = b.kind === "PATH" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return b.count - a.count;
  });
  return out.map((e) => ({
    id: e.id,
    title: e.title,
    kind: e.kind,
    count: e.count,
    curatorUsername: e.curatorUsername,
  }));
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}
