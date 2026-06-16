"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, CornerDownRight, Globe, Link as LinkIcon, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getCollection,
  reorderConnections,
  type CollectionDetail,
  type Connection,
} from "@/modules/blog/api/collections";
import { Avatar } from "@/modules/blog/components/avatar";
import { ConnectionBlock } from "@/modules/blog/components/connection-block";
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
      <CollectionHeader detail={detail} />

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
            <PathWalk connections={detail.connections} locale={locale} />
          ) : (
            <ConnectionList connections={detail.connections} locale={locale} />
          )}
        </>
      )}
    </div>
  );
}

function CollectionHeader({ detail }: { detail: CollectionDetail }) {
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
            <span className="inline-flex items-center gap-1.5">
              <Avatar src={null} name={detail.curatorUsername} size="xs" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                @{detail.curatorUsername}
              </span>
            </span>
            <span aria-hidden>·</span>
          </>
        )}
        <Visibility visibility={detail.visibility} />
        <span aria-hidden>·</span>
        <span>{t("itemCount", { count: detail.connections.length })}</span>
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

/** PATH — the guided walk. Numbered nodes joined by a vertical line; the `why` bridges into each step. */
function PathWalk({ connections, locale }: { connections: Connection[]; locale: string }) {
  return (
    <ol className="space-y-0">
      {connections.map((c, i) => (
        <li key={c.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-50 text-[12px] font-bold text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
              {i + 1}
            </span>
            {i < connections.length - 1 && (
              <span aria-hidden className="w-px flex-1 bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
          <div className={i < connections.length - 1 ? "min-w-0 flex-1 pb-8" : "min-w-0 flex-1 pb-2"}>
            {c.why && (
              <p className="mb-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
                {c.why}
              </p>
            )}
            <ConnectionBlock block={c} locale={locale} />
          </div>
        </li>
      ))}
    </ol>
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
