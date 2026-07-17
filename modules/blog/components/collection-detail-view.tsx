"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  CornerDownRight,
  Globe,
  Link as LinkIcon,
  Loader2,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import {
  currentStepIndex,
  estimatePathMinutes,
  isReadableStep,
  markStepOpened,
  nextReadableStep,
  readOpenedSteps,
} from "@/lib/path-progress";
import {
  deleteCollection,
  disconnect,
  getCollection,
  reorderConnections,
  updateCollection,
  type CollectionDetail,
  type CollectionVisibility,
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
  const { me, authenticated, ready, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [reordering, setReordering] = useState(false);
  // Owner-only meta editor (name / blurb / visibility). Off = read view; on = the inline form.
  const [editing, setEditing] = useState(false);
  // A connection id currently being removed (disconnect), so its row can dim while the request runs.
  const [removingId, setRemovingId] = useState<number | null>(null);

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

  // Save the meta edit — optimistic (the header repaints from the returned summary). A save is a silent
  // action otherwise (the header just changes), so it confirms with a toast; a failure reverts AND says
  // so — no 조용한 실패 (the sheet/담기 surfaces already follow this).
  const onEditSave = useCallback(
    async (patch: { title: string; description: string | null; visibility: CollectionVisibility }) => {
      if (!detail) return;
      setDetail({ ...detail, ...patch });
      setEditing(false);
      try {
        await updateCollection(detail.id, patch);
        toast(t("editSavedToast"), "success");
      } catch {
        load(); // restore the server copy
        toast(t("editError"), "error");
      }
    },
    [detail, load, toast, t],
  );

  // Delete the whole collection — confirm first (destructive, irreversible), then leave for the owner's
  // home once it's gone (the detail page would 404 in place).
  const onDelete = useCallback(async () => {
    if (!detail) return;
    const ok = await confirm({
      title: t("deleteConfirmTitle"),
      description: t("deleteConfirmBody"),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCollection(detail.id);
      if (detail.curatorUsername) {
        window.location.assign(authorHref(detail.curatorUsername, locale));
      } else {
        router.back();
      }
    } catch {
      load(); // the collection is still here — say the delete didn't take (no 조용한 실패)
      toast(t("deleteError"), "error");
    }
  }, [detail, confirm, t, locale, router, load, toast]);

  // Remove one connection (disconnect) — confirm, then drop the row optimistically; reload on failure.
  const onRemoveConnection = useCallback(
    async (connectionId: number) => {
      if (!detail) return;
      const ok = await confirm({
        title: t("removeItemConfirmTitle"),
        description: t("removeItemConfirmBody"),
        confirmLabel: t("removeItem"),
        cancelLabel: t("cancel"),
        destructive: true,
      });
      if (!ok) return;
      setRemovingId(connectionId);
      const prev = detail.connections;
      setDetail({ ...detail, connections: prev.filter((c) => c.id !== connectionId) });
      try {
        await disconnect(detail.id, connectionId);
      } catch {
        load(); // restore the removed row AND say the unlink failed (no 조용한 실패)
        toast(t("unlinkError"), "error");
      } finally {
        setRemovingId(null);
      }
    },
    [detail, confirm, t, load, toast],
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
      {editing && isOwner ? (
        <CollectionEditor
          detail={detail}
          onCancel={() => setEditing(false)}
          onSave={onEditSave}
          onDelete={onDelete}
        />
      ) : (
        <CollectionHeader detail={detail} locale={locale} />
      )}

      {reordering && isPath ? (
        <PathReorder
          connections={detail.connections}
          onCancel={() => setReordering(false)}
          onSave={onReorderSave}
        />
      ) : (
        <>
          {/* Owner controls — a quiet action row (edit meta · reorder a path). Delete moved into the
              editor's danger zone, so this row stays to the two safe, everyday actions. Hidden while the
              inline editor is open (it carries its own save/cancel/delete). */}
          {isOwner && !editing && (
            <div className="mb-2 flex flex-wrap items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("edit")}
              </button>
              {canReorder && (
                <button
                  type="button"
                  onClick={() => setReordering(true)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {t("reorder")}
                </button>
              )}
            </div>
          )}

          {detail.connections.length === 0 ? (
            <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">
              {t("empty")}
            </p>
          ) : isPath ? (
            <PathWalk
              collectionId={detail.id}
              connections={detail.connections}
              locale={locale}
              ownerRemove={isOwner ? onRemoveConnection : undefined}
              removingId={removingId}
            />
          ) : (
            <ConnectionList
              connections={detail.connections}
              locale={locale}
              ownerRemove={isOwner ? onRemoveConnection : undefined}
              removingId={removingId}
            />
          )}

          {/* A closing edge so a short collection (the common 2–4 item case) reads as complete rather
              than trailing into empty page. For a signed-out visitor it doubles as the quiet login door
              this public surface (#627) otherwise lacks — one line + a soft sign-in, never a wall. Hidden
              while the collection is empty (that state already speaks for itself) and until auth settles. */}
          {detail.connections.length > 0 && ready && (
            <CollectionFooter
              isPath={isPath}
              authenticated={authenticated}
              curatorUsername={isOwner ? null : detail.curatorUsername}
              locale={locale}
              onSignIn={signInWithGoogle}
            />
          )}
        </>
      )}
      {confirmDialog}
    </div>
  );
}

/**
 * The closing edge under a collection's blocks. Two jobs: (1) give a short collection a finished bottom
 * so it doesn't dissolve into empty page, and (2) on this public surface, be the quiet login door for a
 * signed-out reader — a single context line + a soft sign-in (never a wall). A signed-in reader gets just
 * the closing line (+ a follow nudge toward the curator, the connection graph's "discover → follow" step).
 */
function CollectionFooter({
  isPath,
  authenticated,
  curatorUsername,
  locale,
  onSignIn,
}: {
  isPath: boolean;
  authenticated: boolean;
  curatorUsername: string | null;
  locale: string;
  onSignIn: () => void;
}) {
  const t = useTranslations("collections");
  return (
    <div className="mt-10 border-t border-slate-100 pt-6 text-[13px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <p>{isPath ? t("footerPathEnd") : t("footerCollectionEnd")}</p>
      {!authenticated ? (
        <p className="mt-1.5">
          {t("footerGuestPrompt")}{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="focus-ring rounded font-medium text-accent-700 transition-colors hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
          >
            {t("footerGuestSignIn")}
          </button>
        </p>
      ) : (
        curatorUsername && (
          <p className="mt-1.5">
            <BlogLink
              href={authorHref(curatorUsername, locale)}
              className="focus-ring rounded font-medium text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
            >
              {t("footerCuratorMore", { curator: curatorUsername })}
            </BlogLink>
          </p>
        )
      )}
    </div>
  );
}

/**
 * Owner-only inline meta editor — name / one-line blurb / visibility. Replaces the read header while
 * open; saving writes to the edit endpoint and repaints the header. Quiet: bare-underline inputs, a
 * segmented visibility pair (the same three the read badge shows), one save + cancel. Limits mirror the
 * backend `EditCollectionRequest` (title ≤ 120, description ≤ 280).
 */
function CollectionEditor({
  detail,
  onCancel,
  onSave,
  onDelete,
}: {
  detail: CollectionDetail;
  onCancel: () => void;
  onSave: (patch: {
    title: string;
    description: string | null;
    visibility: CollectionVisibility;
  }) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("collections");
  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [visibility, setVisibility] = useState<CollectionVisibility>(detail.visibility);
  const trimmedTitle = title.trim();

  // Each visibility is a titled row with a one-line "what this actually does" line — verified against the
  // API (PUBLIC = listed on the author's 컬렉션 tab + flows into 연결 발견; UNLISTED = link-only, unlisted,
  // not discovered; PRIVATE = owner only). The description is the point, the icon just anchors it.
  const options: { key: CollectionVisibility; label: string; desc: string; Icon: typeof Lock }[] = [
    { key: "PRIVATE", label: t("visibilityPrivate"), desc: t("visibilityPrivateDesc"), Icon: Lock },
    { key: "UNLISTED", label: t("visibilityUnlisted"), desc: t("visibilityUnlistedDesc"), Icon: LinkIcon },
    { key: "PUBLIC", label: t("visibilityPublic"), desc: t("visibilityPublicDesc"), Icon: Globe },
  ];

  return (
    <div className="mb-8">
      {/* Each field is its own section — an eyebrow label + a generous gap between — so 이름/설명/공개
          범위/위험이 뚜렷이 다른 층으로 읽힌다(연속 밑줄 나열이 뭉쳐 보이던 게 불만의 뿌리). */}
      <EditorSection label={t("titleLabel")}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          aria-label={t("titleLabel")}
          className="w-full border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-headline-sm font-bold tracking-headline text-slate-900 outline-none transition-colors focus:border-accent-600 dark:border-slate-700 dark:text-slate-100"
        />
      </EditorSection>

      <EditorSection label={t("descriptionLabel")}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          aria-label={t("descriptionLabel")}
          className="w-full resize-none border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-[15px] leading-relaxed text-slate-600 outline-none transition-colors focus:border-accent-600 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-500"
        />
      </EditorSection>

      <EditorSection label={t("visibilityLabel")}>
        {/* Radio ROWS (not a compressed segment): each choice carries its own one-line meaning, and the
            selected one reads as selected at a glance (green ring + check). Clarity over compactness. */}
        <div role="radiogroup" aria-label={t("visibilityLabel")} className="flex flex-col gap-2">
          {options.map(({ key, label, desc, Icon }) => {
            const active = visibility === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setVisibility(key)}
                className={`focus-ring flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-accent-600 bg-accent-50/50 dark:border-accent-500 dark:bg-accent-500/10"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    active ? "text-accent-700 dark:text-accent-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[14px] font-semibold ${
                      active ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {desc}
                  </span>
                </span>
                {/* Selected state is self-evident — a green check disc, empty ring otherwise. */}
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    active
                      ? "border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {active && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </EditorSection>

      {/* Save / cancel — the primary action row, clearly above the danger zone (never adjacent to it). */}
      <div className="mt-7 flex items-center gap-2">
        <button
          type="button"
          disabled={!trimmedTitle}
          onClick={() =>
            onSave({ title: trimmedTitle, description: description.trim() || null, visibility })
          }
          className="focus-ring rounded-lg bg-accent-700 px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-40"
        >
          {t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring rounded-lg px-3 py-2 text-[14px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t("cancel")}
        </button>
      </div>

      {/* Danger zone — a separated, red-framed section at the bottom so an irreversible delete can't be
          fired by muscle memory next to Save. The confirm dialog still gates the actual delete. */}
      <div className="mt-8 rounded-xl border border-red-200 p-4 dark:border-red-500/30">
        <p className="text-[11px] font-bold uppercase tracking-wide text-red-600/80 dark:text-red-400/80">
          {t("dangerZone")}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t("deleteCollectionDesc")}
          </p>
          <button
            type="button"
            onClick={onDelete}
            className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("deleteCollection")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One field section of the editor — an eyebrow label + its control, with the section rhythm that makes
 *  이름/설명/공개 범위 read as distinct layers rather than one run of underlines. */
function EditorSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {children}
    </section>
  );
}

function CollectionHeader({ detail, locale }: { detail: CollectionDetail; locale: string }) {
  const t = useTranslations("collections");
  const isPath = detail.kind === "PATH";
  return (
    <header className="mb-8 border-b border-slate-100 pb-6 dark:border-slate-800">
      {isPath && (
        <span className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-accent-700 dark:text-accent-400">
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
  ownerRemove,
  removingId,
}: {
  collectionId: number;
  connections: Connection[];
  locale: string;
  ownerRemove?: (connectionId: number) => void;
  removingId: number | null;
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
  // The step the continuity bar continues INTO: the next readable step AT OR AFTER the first *unopened*
  // step (`rawIndex`) — the walk continues into the next thing to read, not past it. Keyed on the
  // unclamped `rawIndex` (not the clamped `currentIndex`) so that once every step is opened it resolves
  // to null instead of re-pointing at the already-read final step. Skips notes; null once nothing
  // readable remains (a trailing note, or you're done).
  const continueTarget = useMemo(
    () => nextReadableStep(connections, rawIndex),
    [connections, rawIndex],
  );
  // Exhausted = the reading layer has loaded and nothing readable remains to continue into — either every
  // step is opened (rawIndex ran past the end) or you're parked on a trailing NOTE that has no
  // destination. Either way the walk is done, so the quiet closing line shows instead of a dead CTA.
  const walkExhausted = opened != null && continueTarget === null;

  const onOpen = useCallback(
    (connectionId: number) => {
      markStepOpened(collectionId, connectionId);
      setOpened(readOpenedSteps(collectionId));
    },
    [collectionId],
  );

  // Advance the walk past every step from where you are up to (and including) the readable target. This
  // marks any intervening NOTE opened too — a NOTE never gets its own click (no destination), so without
  // this the current step would stay unopened and the walk would stick there, never reaching completion.
  const onContinue = useCallback(
    (targetIndex: number) => {
      for (let i = currentIndex; i <= targetIndex; i++) markStepOpened(collectionId, connections[i].id);
      setOpened(readOpenedSteps(collectionId));
    },
    [collectionId, connections, currentIndex],
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
                    ? "bg-accent-700 text-white dark:bg-accent-500 dark:text-slate-950"
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
                      ? "bg-gradient-to-b from-accent-600 to-slate-200 dark:from-accent-500 dark:to-slate-700"
                      : isReached
                        ? "bg-accent-200 dark:bg-accent-500/30"
                        : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
            <div
              className={`${isLast ? "min-w-0 flex-1 pb-2" : "min-w-0 flex-1 pb-8"} ${
                removingId === c.id ? "opacity-50 transition-opacity" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Steps ahead of where you are dim — the eye lands on the current step. Marking a step
                    opened on click into its block is the device-local "I've read this" signal. */}
                <div
                  className={`min-w-0 flex-1 ${i > currentIndex ? "opacity-50 transition-opacity" : "transition-opacity"}`}
                  onClickCapture={() => onOpen(c.id)}
                >
                  {c.why && (
                    <p className="mb-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
                      {c.why}
                    </p>
                  )}
                  <ConnectionBlock block={c} locale={locale} />
                </div>
                {ownerRemove && (
                  <RemoveConnectionButton
                    onRemove={() => ownerRemove(c.id)}
                    disabled={removingId === c.id}
                  />
                )}
              </div>
              {isCurrent && continueTarget && (
                <ContinuityBar
                  target={continueTarget.step}
                  here={currentIndex + 1}
                  nextStep={continueTarget.index + 1}
                  total={connections.length}
                  locale={locale}
                  onContinue={() => onContinue(continueTarget.index)}
                  t={t}
                />
              )}
              {isCurrent && !continueTarget && walkExhausted && (
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
  onContinue,
  t,
}: {
  target: Connection;
  here: number;
  nextStep: number;
  total: number;
  locale: string;
  onContinue: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const href =
    target.blockType === "HIGHLIGHT"
      ? quoteHref(target.username!, target.slug!, target.quote ?? "", locale)
      : postHref(target.username!, target.slug!, locale);

  return (
    <BlogLink
      href={href}
      onClick={onContinue}
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
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-700 px-3.5 py-1.5 text-[12.5px] font-bold text-white dark:bg-accent-500 dark:text-slate-950">
        {t("pathContinueCta")}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </BlogLink>
  );
}

/** COLLECTION — a simple connection list, each with its optional `why`. The owner gets a quiet remove
 *  (disconnect) affordance per row. */
function ConnectionList({
  connections,
  locale,
  ownerRemove,
  removingId,
}: {
  connections: Connection[];
  locale: string;
  ownerRemove?: (connectionId: number) => void;
  removingId: number | null;
}) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {connections.map((c) => (
        <li
          key={c.id}
          className={`py-5 first:pt-0 ${removingId === c.id ? "opacity-50 transition-opacity" : ""}`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {c.why && (
                <p className="mb-2.5 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
                  {c.why}
                </p>
              )}
              <ConnectionBlock block={c} locale={locale} />
            </div>
            {ownerRemove && (
              <RemoveConnectionButton
                onRemove={() => ownerRemove(c.id)}
                disabled={removingId === c.id}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Quiet per-connection remove (disconnect) — a small text "해제" ghost button, red only on hover, so it
 *  never competes with the reading content. A bare × read as "close/dismiss" (사장님 신고); the word names
 *  the action (unlink from this collection). Shared by the collection list and the path walk. */
function RemoveConnectionButton({
  onRemove,
  disabled,
}: {
  onRemove: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("collections");
  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      className="focus-ring mt-0.5 shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      {t("unlink")}
    </button>
  );
}
