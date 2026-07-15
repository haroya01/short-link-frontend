"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, BarChart3, Layers, List, PenSquare, Pin, X } from "lucide-react";
import { ExportMdButton } from "@/modules/blog/components/workspace/export-md-button";
import { ImportMdButton } from "@/modules/blog/components/workspace/import-md-button";
import { useAuth } from "@/lib/auth";
import { dateLocale } from "@/lib/date";
import { listMyPosts, type PostStatus, type PostView } from "@/modules/blog/api/posts";
import { setPinnedPosts } from "@/modules/blog/api/curation";
import { PostStatusBadge } from "@/modules/blog/components/post-status-badge";
import { showLikes } from "@/modules/blog/lib/public-metrics";
import { SeriesGroupedView } from "@/modules/blog/components/workspace/series-grouped-view";
import { SkeletonRows } from "@/modules/blog/components/skeleton";
import { BlogLink } from "@/modules/blog/components/blog-link";

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "3 hours ago" style, locale-aware — so the draft list reads as "what was I working on". */
function relativeTime(iso: string, locale: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms || unit === "minute") return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "minute");
}

/** Absolute publish instant for a scheduled row — the author needs the exact date·time, not "in 3
 *  days". Pinned to Asia/Seoul (the app's canonical publish clock) so server and client agree and it
 *  doesn't drift with the reader's device timezone. */
function scheduledLabel(iso: string, locale: string): string {
  const when = new Date(iso);
  // Show the year only when it isn't this year — a post scheduled for next January reading as just
  // "Jan 3" would be ambiguous, but carrying the year on every near-term row is noise.
  const showYear = when.getFullYear() !== new Date().getFullYear();
  return when.toLocaleString(dateLocale(locale), {
    ...(showYear ? { year: "numeric" } : {}),
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

export default function WriteIndexPage() {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  const { ready, authenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // "시리즈별 보기" is a view of this same list, driven by ?view=series (so /series can forward here and
  // the choice is shareable). Derive the initial view synchronously from the live URL (not
  // useSearchParams(), which bails into the CSR-only build path) so a ?view=series entry doesn't paint
  // the 'all' view for a frame first. Series management lives in that view — no separate series page.
  const [view, setView] = useState<"all" | "series">(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "series"
      ? "series"
      : "all",
  );
  const [posts, setPosts] = useState<PostView[]>([]);
  const [filter, setFilter] = useState<"all" | PostStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Preserve the current path prefix (locale + /blog-preview on the apex) for intra-blog links —
  // a root-relative "/write/..." would drop the prefix and 404.
  const [writeBase, setWriteBase] = useState("/write");

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

  function changeView(v: "all" | "series") {
    setView(v);
    router.replace(v === "series" ? `${pathname}?view=series` : pathname, { scroll: false });
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await listMyPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  // 대표글(pins): state rides on each post's pinOrder. A pin edit recomputes the ordered id list and
  // PUTs it (replace-whole-set semantics). Update locally first so the row reacts instantly, then
  // persist; on failure reload to resync. Only PUBLISHED posts are pinnable (backend ignores others).
  const applyPins = useCallback(
    (orderedIds: number[]) => {
      setPosts((prev) =>
        prev.map((p) => {
          const idx = orderedIds.indexOf(p.id);
          return { ...p, pinOrder: idx >= 0 ? idx : null };
        }),
      );
      void setPinnedPosts(orderedIds).catch(() => void load());
    },
    [load],
  );

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  // Per-post analytics lives at the sibling /analytics/{id} route — derive its base from writeBase.
  const analyticsBase = writeBase.replace(/\/write$/, "/analytics");
  const count = (s: "all" | PostStatus) =>
    s === "all" ? posts.length : posts.filter((p) => p.status === s).length;
  // Tabs: 전체 + only the statuses that actually have posts, so the bar stays as quiet as the content.
  const TAB_STATUSES: PostStatus[] = ["PUBLISHED", "DRAFT", "SCHEDULED", "UNPUBLISHED"];
  const tabs: ("all" | PostStatus)[] = ["all", ...TAB_STATUSES.filter((s) => count(s) > 0)];
  const visible = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  // Pinned posts in display order — drives the 대표글 manage strip and each row's toggle state.
  const pinned = posts
    .filter((p) => p.pinOrder != null)
    .sort((a, b) => (a.pinOrder as number) - (b.pinOrder as number));
  // Hub summary inputs — derived from the already-loaded list, no extra fetch.
  const totalViews = posts.reduce((n, p) => n + (p.status === "PUBLISHED" ? p.viewCount : 0), 0);
  const totalLikes = posts.reduce((n, p) => n + (p.likeCount ?? 0), 0);
  // "이어서 쓰기" — the most recently touched draft, the thing a returning writer looks for first.
  const latestDraft = posts
    .filter((p) => p.status === "DRAFT")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
  const pinnedIds = () => pinned.map((p) => p.id);
  const togglePin = (post: PostView) => {
    const ids = pinnedIds();
    applyPins(ids.includes(post.id) ? ids.filter((i) => i !== post.id) : [...ids, post.id]);
  };
  const movePin = (id: number, dir: -1 | 1) => {
    const ids = pinnedIds();
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    applyPins(ids);
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("myPosts")}</h1>
          {/* Cumulative reach — the one summary the filter chips don't already carry. Counts per
              status live on the chips below; this line answers "내 글이 얼마나 읽혔나" at a glance. */}
          {totalViews > 0 && (
            <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
              {t("viewCount", { count: totalViews })}
              {totalLikes > 0 && <> · {t("likeCount", { count: totalLikes })}</>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportMdButton />
          <ImportMdButton onDone={load} />
          <BlogLink
            href={`${writeBase}/new`}
            className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800 sm:px-4"
          >
            <PenSquare className="h-4 w-4" />
            {t("newPost")}
          </BlogLink>
        </div>
      </header>

      {/* 전체 ↔ 시리즈별 — same content, two lenses. 시리즈별 is where series get curated.
          분석의 WindowTabs 와 같은 pill 세그먼트 — 워크스페이스 전환 컨트롤 한 가지 모양. */}
      <div className="mb-5 inline-flex rounded-full border border-slate-200 p-0.5 dark:border-slate-800">
        {([
          ["all", t("viewAll"), List],
          ["series", t("viewBySeries"), Layers],
        ] as const).map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            onClick={() => changeView(v)}
            aria-pressed={view === v}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              view === v
                ? "bg-accent-700 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {view === "series" ? (
        <SeriesGroupedView writeBase={writeBase} />
      ) : (
        <>
      {/* 이어서 쓰기 — 돌아온 작가의 첫 질문("어디까지 썼더라")에 바로 답하는 진입. 가장 최근
          임시저장 1건만, 조용한 그린 틴트 카드로. 임시저장이 없으면 섹션 자체가 없다. */}
      {!loading && latestDraft && (
        <BlogLink
          href={`${writeBase}/${latestDraft.id}`}
          className="focus-ring group mb-5 flex items-center gap-3 rounded-xl border border-accent-200/70 bg-accent-50/50 px-4 py-3 transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-accent-500/25 dark:bg-accent-500/10 dark:hover:border-accent-500/40 dark:hover:bg-accent-500/15"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-700 text-white transition-transform duration-200 ease-[var(--ease)] group-hover:scale-105 motion-reduce:transform-none">
            <PenSquare className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-accent-700 dark:text-accent-400">
              {t("continueWriting")}
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              {latestDraft.title.trim() || t("untitled")}
            </span>
          </span>
          <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">
            {relativeTime(latestDraft.updatedAt, locale)}
          </span>
        </BlogLink>
      )}

      {/* 대표글 관리 — 핀한 글을 공개 블로그 '대표글' 섹션에 이 순서로 노출. 순서 조정·해제는 여기서. */}
      {!loading && pinned.length > 0 && (
        <section className="mb-5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
            <Pin className="h-3.5 w-3.5 fill-current text-accent-600 dark:text-accent-400" />
            {t("featuredManageTitle")}
          </h2>
          <ul className="flex flex-col">
            {pinned.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                <span className="w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums text-accent-600 dark:text-accent-400">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-slate-700 dark:text-slate-200">
                  {p.title.trim() || t("untitled")}
                </span>
                <button
                  type="button"
                  onClick={() => movePin(p.id, -1)}
                  disabled={i === 0}
                  aria-label={t("featuredMoveUp")}
                  className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => movePin(p.id, 1)}
                  disabled={i === pinned.length - 1}
                  aria-label={t("featuredMoveDown")}
                  className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePin(p)}
                  aria-label={t("featuredUnpin")}
                  className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && posts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {tabs.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              aria-pressed={filter === s}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filter === s
                  ? "bg-accent-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
              }`}
            >
              {s === "all" ? t("filterAll") : t(`status${s}`)}
              <span className={filter === s ? "text-white/70" : "text-slate-500 dark:text-slate-500"}>{count(s)}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <SkeletonRows count={6} thumb />}
      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
            <PenSquare className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("noPosts")}</p>
            <p className="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">{t("noPostsHint")}</p>
          </div>
          <BlogLink
            href={`${writeBase}/new`}
            className="focus-ring mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800"
          >
            <PenSquare className="h-4 w-4" />
            {t("newPost")}
          </BlogLink>
        </div>
      )}
      {!loading && posts.length > 0 && (
        // Typography-first rows (§10.2): no placeholder thumbnail — a post with no cover is a complete
        // text row; the cover shows only when it exists. Lead = 대표 태그(muted) + status, then title,
        // 2-line excerpt, quiet meta. -mx-3/px-3 keeps text aligned with the heading while hover spills.
        <ul className="-mx-3 flex flex-col">
          {visible.map((p, rowIdx) => {
            const titled = p.title.trim();
            // Analytics only means something once a post has gone public — drafts·scheduled have no reads.
            const hasAnalytics = p.status === "PUBLISHED" || p.status === "UNPUBLISHED";
            return (
              <li
                key={p.id}
                className="profile-fade group/row relative border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                style={{ ["--idx" as string]: Math.min(rowIdx, 8) } as React.CSSProperties}
              >
                <BlogLink
                  href={`${writeBase}/${p.id}`}
                  className={`focus-ring group block rounded-xl px-3 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                    p.status === "PUBLISHED" ? "pr-24 sm:pr-32" : hasAnalytics ? "pr-16 sm:pr-28" : "pr-3"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[12px]">
                        <PostStatusBadge status={p.status} />
                        {p.tags[0] && (
                          <span className="truncate text-slate-500 dark:text-slate-500">{p.tags[0]}</span>
                        )}
                      </div>
                      <h3
                        className={`mt-1.5 truncate text-[17px] font-semibold leading-snug transition-colors group-hover:text-accent-700 dark:group-hover:text-accent-300 ${
                          titled ? "text-slate-900 dark:text-slate-100" : "italic text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {titled || t("untitled")}
                      </h3>
                      {p.excerpt && (
                        <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {p.excerpt}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                        <span className="whitespace-nowrap">{relativeTime(p.updatedAt, locale)}</span>
                        {p.status === "SCHEDULED" && p.scheduledAt && (
                          // The row time above is 마지막 수정; a scheduled draft's whole point is *when*
                          // it goes live, so surface that instant explicitly (populated but hidden before).
                          <span className="whitespace-nowrap text-accent-700 dark:text-accent-300">
                            · {t("scheduledFor", { when: scheduledLabel(p.scheduledAt, locale) })}
                          </span>
                        )}
                        {p.status === "PUBLISHED" && p.viewCount > 0 && (
                          <span className="whitespace-nowrap">· {t("viewCount", { count: p.viewCount })}</span>
                        )}
                        {showLikes(p.likeCount ?? 0) && (
                          <span className="whitespace-nowrap">· {t("likeCount", { count: p.likeCount })}</span>
                        )}
                        <span className="truncate font-mono text-slate-500 dark:text-slate-600">{p.slug}</span>
                      </div>
                    </div>
                    {p.ogImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.ogImageUrl}
                        alt=""
                        className="h-[4.5rem] w-28 shrink-0 self-start rounded-lg object-cover sm:w-32"
                      />
                    )}
                  </div>
                </BlogLink>
                {/* Action cluster — siblings of the editor link (never nested). 대표글 toggle (published
                    only) + per-post 성과. This list is the hub: pinning and analytics live inline. */}
                {(hasAnalytics || p.status === "PUBLISHED") && (
                  <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
                    {p.status === "PUBLISHED" && (
                      <button
                        type="button"
                        onClick={() => togglePin(p)}
                        aria-pressed={p.pinOrder != null}
                        aria-label={p.pinOrder != null ? t("featuredUnpin") : t("featuredPin")}
                        title={p.pinOrder != null ? t("featuredPinnedLabel") : t("featuredPin")}
                        className={`focus-ring grid h-8 w-8 place-items-center rounded-lg border backdrop-blur transition-colors ${
                          p.pinOrder != null
                            ? "border-accent-300 bg-accent-50 text-accent-700 hover:bg-accent-100 dark:border-accent-500/40 dark:bg-accent-500/15 dark:text-accent-300"
                            : "border-slate-200 bg-white/80 text-slate-400 hover:border-accent-200 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500 dark:hover:border-accent-500/40 dark:hover:text-accent-300"
                        }`}
                      >
                        <Pin className={`h-4 w-4 ${p.pinOrder != null ? "fill-current" : ""}`} />
                      </button>
                    )}
                    {hasAnalytics && (
                      <BlogLink
                        href={`${analyticsBase}/${p.id}`}
                        aria-label={t("viewAnalytics")}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[12px] font-medium text-slate-500 backdrop-blur transition-colors hover:border-accent-200 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-accent-500/40 dark:hover:text-accent-300"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("viewAnalytics")}</span>
                      </BlogLink>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {/* 조용한 종결 CTA — 리스트가 끝났을 때 다음 행동이 손 닿는 곳에. 대시 보더 = "아직
              없는 글"의 자리라는 어휘. */}
          <li className="profile-fade" style={{ ["--idx" as string]: Math.min(visible.length, 9) } as React.CSSProperties}>
            <BlogLink
              href={`${writeBase}/new`}
              className="focus-ring mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-[13.5px] font-medium text-slate-500 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-accent-500/40 dark:hover:text-accent-300"
            >
              <PenSquare className="h-4 w-4" />
              {t("newPost")}
            </BlogLink>
          </li>
        </ul>
      )}
        </>
      )}
    </main>
  );
}

