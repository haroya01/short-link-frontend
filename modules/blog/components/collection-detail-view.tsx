"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpDown,
  CornerDownRight,
  Globe,
  Link as LinkIcon,
  Loader2,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  currentStepIndex,
  estimatePathMinutes,
  isReadableStep,
  markStepOpened,
  nextReadableStep,
  readOpenedSteps,
} from "@/lib/path-progress";
import {
  getCollection,
  reorderConnections,
  type CollectionDetail,
  type Connection,
} from "@/modules/blog/api/collections";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { ConnectionBlock, quoteHref } from "@/modules/blog/components/connection-block";
import { PathReorder } from "@/modules/blog/components/path-reorder";

/**
 * Collection detail. A PATH renders as a guided walk — numbered steps joined by a connecting line, the
 * curator's `why` as the bridge into each step, the block below it (a highlight deep-links to the
 * source post at that sentence). A COLLECTION renders as a simple connection list. The owner of a
 * multi-step PATH can reorder it (drag), which writes the full ordered id list to the reorder endpoint.
 */
export function CollectionDetailView({
  collectionId,
  locale,
}: {
  collectionId: number;
  locale: string;
}) {
  const t = useTranslations("collections");
  const { me } = useAuth();
  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [reordering, setReordering] = useState(false);

  const load = useCallback(() => {
    setState("loading");
    getCollection(collectionId)
      .then((d) => {
        setDetail(d);
        setState(d ? "ready" : "missing");
      })
      .catch(() => setState("missing"));
  }, [collectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!detail?.curatorUsername && detail.curatorUsername === me?.username;
  const isPath = detail?.kind === "PATH";
  const canReorder = isOwner && isPath && (detail?.connections.length ?? 0) > 1;

  const onReorderSave = useCallback(
    async (ids: number[]) => {
      if (!detail) return;
      const byId = new Map(detail.connections.map((c) => [c.id, c]));
      const next = ids.map((id) => byId.get(id)).filter((c): c is Connection => !!c);
      setDetail({ ...detail, connections: next });
      setReordering(false);
      try {
        await reorderConnections(detail.id, ids);
      } catch {
        load(); // restore server order on failure
      }
    },
    [detail, load],
  );

  if (state === "loading") {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (state === "missing" || !detail) {
    return (
      <p className="py-24 text-center text-[14px] text-slate-500 dark:text-slate-400">
        {t("notFound")}
      </p>
    );
  }

  return (
    <div>
      <CollectionHeader detail={detail} locale={locale} />

      {reordering && isPath ? (
        <PathReorder
          connections={detail.connections}
          onCancel={() => setReordering(false)}
          onSave={onReorderSave}
        />
      ) : (
        <>
          {canReorder && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setReordering(true)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {t("reorder")}
              </button>
            </div>
          )}

          {detail.connections.length === 0 ? (
            <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">
              {t("empty")}
            </p>
          ) : isPath ? (
            <PathWalk collectionId={detail.id} connections={detail.connections} locale={locale} />
          ) : (
            <ConnectionList connections={detail.connections} locale={locale} />
          )}
        </>
      )}
    </div>
  );
}

function CollectionHeader({ detail, locale }: { detail: CollectionDetail; locale: string }) {
  const t = useTranslations("collections");
  const isPath = detail.kind === "PATH";
  return (
    <header className="mb-8 border-b border-slate-100 pb-6 dark:border-slate-800">
      {isPath && (
        <span className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-accent-700 dark:text-accent-400">
          <CornerDownRight className="h-3.5 w-3.5" />
          {t("pathEyebrow")}
        </span>
      )}
      <h1 className="text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100">
        {detail.title}
      </h1>
      {detail.description && (
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          {detail.description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400">
        {detail.curatorUsername && (
          <>
            {/* The curator is a link to their home — the connection graph's "discover who, then follow"
                step. Tap a path's curator → their posts/series → follow. */}
            <BlogLink
              href={authorHref(detail.curatorUsername, locale)}
              className="focus-ring group inline-flex items-center gap-1.5 rounded"
            >
              <Avatar src={null} name={detail.curatorUsername} size="xs" />
              <span className="font-medium text-slate-700 transition-colors group-hover:text-accent-700 dark:text-slate-300 dark:group-hover:text-accent-400">
                @{detail.curatorUsername}
              </span>
            </BlogLink>
            <span aria-hidden>·</span>
          </>
        )}
        <Visibility visibility={detail.visibility} />
        <span aria-hidden>·</span>
        <span>{t("itemCount", { count: detail.connections.length })}</span>
        {/* A PATH is a reading destination, so its meta carries an estimated duration ("약 N분") — a
            coarse per-readable-step estimate, since the connection payload has no word counts. */}
        {isPath && detail.connections.some(isReadableStep) && (
          <>
            <span aria-hidden>·</span>
            <span>{t("pathReadTime", { minutes: estimatePathMinutes(detail.connections) })}</span>
          </>
        )}
      </div>
    </header>
  );
}

function Visibility({ visibility }: { visibility: CollectionDetail["visibility"] }) {
  const t = useTranslations("collections");
  const map = {
    PRIVATE: { Icon: Lock, label: t("visibilityPrivate") },
    UNLISTED: { Icon: LinkIcon, label: t("visibilityUnlisted") },
    PUBLIC: { Icon: Globe, label: t("visibilityPublic") },
  } as const;
  const { Icon, label } = map[visibility];
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/**
 * PATH — the guided walk, read as a destination (not a list). Numbered nodes joined by a vertical
 * line; the `why` bridges into each step; the block below deep-links to the source. On top of that
 * base walk (unchanged), a device-local reading layer marks where you are: the current node is
 * FILLED, its thread fades out below it, steps you haven't reached dim, and a quiet green continuity
 * bar under the current step offers "continue" into the next readable step. Progress is per-device
 * (localStorage) — no account, no backend; the ordered connections + `why` already arrive from the
 * server (see {@link file://../../../lib/path-progress.ts path-progress}).
 */
function PathWalk({
  collectionId,
  connections,
  locale,
}: {
  collectionId: number;
  connections: Connection[];
  locale: string;
}) {
  const t = useTranslations("collections");
  // Opened-step set is read on the client only (localStorage), mirroring ReadingResume's mount gate —
  // this avoids SSR document access and a hydration mismatch. Before it loads, the walk renders as the
  // plain base (current index 0), then the reading layer paints in.
  const [opened, setOpened] = useState<Set<number> | null>(null);
  useEffect(() => setOpened(readOpenedSteps(collectionId)), [collectionId]);

  // Where you are: the first step not yet opened (clamped to the last real step once you've reached the
  // end, so the highlight + bar sit on the final step rather than vanishing).
  const rawIndex = useMemo(
    () => currentStepIndex(connections, opened ?? new Set()),
    [connections, opened],
  );
  const currentIndex = Math.min(rawIndex, connections.length - 1);
  // The step the continuity bar continues INTO: the next readable step AFTER where you are. Skips
  // notes; null once nothing readable remains (a trailing note, or you're on the last step).
  const continueTarget = useMemo(
    () => nextReadableStep(connections, currentIndex + 1),
    [connections, currentIndex],
  );
  // Complete = every step opened (rawIndex ran past the end). A quiet closing line, no CTA.
  const isComplete = opened != null && rawIndex >= connections.length;

  const onOpen = useCallback(
    (connectionId: number) => {
      markStepOpened(collectionId, connectionId);
      setOpened(readOpenedSteps(collectionId));
    },
    [collectionId],
  );

  return (
    <ol className="space-y-0">
      {connections.map((c, i) => {
        const isCurrent = i === currentIndex;
        const isReached = i <= currentIndex; // opened, or the step you're on
        const isLast = i === connections.length - 1;
        return (
          <li key={c.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              {/* Node: the current step is a FILLED node (where you are); reached steps keep the tinted
                  node; steps ahead are muted. Base size/shape unchanged. */}
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                  isCurrent
                    ? "bg-accent-600 text-white dark:bg-accent-500"
                    : isReached
                      ? "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              {!isLast && (
                // Thread fades out below the current node — the walk "runs out" at where you are.
                <span
                  aria-hidden
                  className={`w-px flex-1 ${
                    isCurrent
                      ? "bg-gradient-to-b from-accent-500 to-slate-200 dark:from-accent-500 dark:to-slate-700"
                      : isReached
                        ? "bg-accent-200 dark:bg-accent-500/30"
                        : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
            <div className={isLast ? "min-w-0 flex-1 pb-2" : "min-w-0 flex-1 pb-8"}>
              {/* Steps ahead of where you are dim — the eye lands on the current step. Marking a step
                  opened on click into its block is the device-local "I've read this" signal. */}
              <div
                className={i > currentIndex ? "opacity-50 transition-opacity" : "transition-opacity"}
                onClickCapture={() => onOpen(c.id)}
              >
                {c.why && (
                  <p className="mb-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
                    {c.why}
                  </p>
                )}
                <ConnectionBlock block={c} locale={locale} />
              </div>
              {isCurrent && continueTarget && (
                <ContinuityBar
                  target={continueTarget.step}
                  here={currentIndex + 1}
                  nextStep={continueTarget.index + 1}
                  total={connections.length}
                  locale={locale}
                  onOpen={onOpen}
                  t={t}
                />
              )}
              {isCurrent && !continueTarget && isComplete && (
                <p className="mt-3 text-[13px] font-medium text-accent-700 dark:text-accent-400">
                  {t("pathComplete")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The "continue reading" continuity bar under the current step — the quiet green tint affordance that
 * turns the walk into one read-through. It links to the next readable step's source (a post, or a
 * highlight deep-linked at its sentence) and marks that step opened on the way out, so the walk
 * advances. No box art, no icons beyond a single arrow — §10 quiet.
 */
function ContinuityBar({
  target,
  here,
  nextStep,
  total,
  locale,
  onOpen,
  t,
}: {
  target: Connection;
  here: number;
  nextStep: number;
  total: number;
  locale: string;
  onOpen: (id: number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const href =
    target.blockType === "HIGHLIGHT"
      ? quoteHref(target.username!, target.slug!, target.quote ?? "", locale)
      : postHref(target.username!, target.slug!, locale);

  return (
    <BlogLink
      href={href}
      onClick={() => onOpen(target.id)}
      className="focus-ring mt-3 flex items-center justify-between gap-3 rounded-xl border border-accent-100 bg-accent-50/60 px-4 py-3 transition-colors hover:bg-accent-50 dark:border-accent-500/25 dark:bg-accent-500/10 dark:hover:bg-accent-500/15"
    >
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-accent-700 dark:text-accent-400">
          {t("pathHere", { current: here, total })}
        </span>
        <span className="mt-0.5 block truncate text-[14px] font-bold text-slate-900 dark:text-slate-100">
          {t("pathContinue", { step: nextStep })}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-600 px-3.5 py-1.5 text-[12.5px] font-bold text-white dark:bg-accent-500">
        {t("pathContinueCta")}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </BlogLink>
  );
}

/** COLLECTION — a simple connection list, each with its optional `why`. */
function ConnectionList({ connections, locale }: { connections: Connection[]; locale: string }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {connections.map((c) => (
        <li key={c.id} className="py-5 first:pt-0">
          {c.why && (
            <p className="mb-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
              {c.why}
            </p>
          )}
          <ConnectionBlock block={c} locale={locale} />
        </li>
      ))}
    </ul>
  );
}
