"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Check, CornerDownRight, Globe, Link as LinkIcon, Loader2, Lock, Plus } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/components/ui/toast";
import {
  connectBlock,
  createCollection,
  disconnect,
  listMyCollections,
  type CollectionSummary,
  type CollectionVisibility,
  type ConnectionBlockType,
} from "@/modules/blog/api/collections";

/**
 * "연결" — the verb. Connect a block (post / highlight / note) to a collection or PATH (not broadcast).
 * Two depths: ① where to file it (pick collections, or make a new one) → ② add (the one-line "왜" +
 * confirm). The "왜" is what separates a collection from a plain bookmark, so it gets its own focused
 * moment after picking. A bottom sheet (mobile) / centered card (sm+).
 *
 * Rows the block is ALREADY in show a "담김" badge + an unlink (해제) instead of a checkbox — the block
 * context (blockType + refId) is passed to the list fetch so the backend marks them (#617). A new
 * collection is made through an inline mini-form (name + visibility) rather than silently borrowing the
 * post's title. On success a toast confirms and the sheet closes.
 */
export function ConnectSheet({
  blockType,
  refId,
  targetLabel,
  targetTitle,
  onClose,
  onDone,
}: {
  blockType: ConnectionBlockType;
  refId: number;
  /** A short kind label for the target (e.g. "하이라이트"). */
  targetLabel: string;
  /** The target's text (the quote / title) — shown in step 2 and used to name a new path. */
  targetTitle: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("collections");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // 목록 로드 실패 — 빈 계정과 헷갈리지 않게 재시도를 내민다(빈 상태 ≠ 에러).
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Which collections already hold THIS block: collectionId → the existing connection's id. Seeded from
  // the list fetch (rows carry `connectionId`), then kept current as the user unlinks (delete → drop the
  // entry) so a row can flip back to selectable in place. A held row can't also be picked to add.
  const [heldBy, setHeldBy] = useState<Map<number, number>>(new Map());
  // The id of a row whose unlink is in flight, so it can show a spinner and go inert.
  const [unlinking, setUnlinking] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // The inline "new collection" mini-form (name + visibility). Null = closed; open replaces the plain
  // create row with the form so a collection is named on purpose, not silently titled from the post.
  const [newForm, setNewForm] = useState<{ name: string; visibility: CollectionVisibility } | null>(
    null,
  );
  const [creating, setCreating] = useState<"COLLECTION" | "PATH" | null>(null);
  const [createFailed, setCreateFailed] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // The parent unmounts this component on onClose/onDone, so the exit phase has to be owned here:
  // closing flips `open` false, use-presence plays the sheet-down/fade exit, and only when it
  // unmounts do we hand control back to the parent (which then drops the whole subtree).
  const [open, setOpen] = useState(true);
  const { mounted, closing } = usePresence(open, 240);
  // Portal target (<body>) only exists on the client; gate so the first render matches SSR (nothing)
  // and avoids a hydration mismatch before we can portal out.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);
  const doneRef = useRef(false);
  const firedRef = useRef(false);
  const requestClose = () => setOpen(false);
  const finish = () => {
    doneRef.current = true;
    setOpen(false);
  };
  useEffect(() => {
    if (mounted || firedRef.current) return;
    firedRef.current = true;
    (doneRef.current ? onDone : onClose)();
  }, [mounted, onClose, onDone]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    // Pass the block context so each row comes back knowing whether it already holds this block.
    listMyCollections({ blockType, refId })
      .then((list) => {
        if (!alive) return;
        setCollections(list);
        const held = new Map<number, number>();
        for (const c of list) if (c.connectionId != null) held.set(c.id, c.connectionId);
        setHeldBy(held);
      })
      .catch(() => {
        // 실패를 "컬렉션 없음"으로 위장하지 않는다 — iOS 시트의 failedState 와 같은 계약.
        if (!alive) return;
        setCollections([]);
        setLoadFailed(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [blockType, refId, reloadKey]);

  // Lock the page behind the scrim while open (same as the account sheet) so an overscroll behind the
  // sheet — or a tap the browser is still deciding might be a page scroll — can't steal the gesture.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard containment: Escape + Tab cycling within the sheet + focus restore to the opener. Step 2
  // places its own initial focus (the 왜 textarea autoFocuses), so don't fight it.
  useFocusTrap(sheetRef, { active: open, onEscape: requestClose, autoFocus: step === 1 });

  function toggle(id: number) {
    if (heldBy.has(id)) return; // already in — pick is a no-op (the unlink control governs it instead)
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Unlink a row the block is already in — DELETE the existing connection, then drop it from `heldBy`
  // so the row flips back to a plain (selectable) row. Failure is surfaced as a toast; the row stays
  // "담김" (nothing changed).
  async function unlink(collectionId: number) {
    const connectionId = heldBy.get(collectionId);
    if (connectionId == null || unlinking != null) return;
    setUnlinking(collectionId);
    try {
      await disconnect(collectionId, connectionId);
      setHeldBy((prev) => {
        const next = new Map(prev);
        next.delete(collectionId);
        return next;
      });
    } catch {
      toast(t("unlinkError"), "error");
    } finally {
      setUnlinking(null);
    }
  }

  // Create a PATH from the plain row (unchanged): borrow the target's text as the title, private by
  // default, then select it. (COLLECTION goes through the mini-form instead — see NewCollectionForm.)
  async function createPathAndSelect() {
    if (creating) return;
    const title = targetTitle.trim().slice(0, 60) || t("newPathFallback");
    setCreating("PATH");
    setCreateFailed(false);
    try {
      const created = await createCollection({ title, visibility: "PRIVATE", kind: "PATH" });
      setCollections((prev) => [created, ...prev]);
      setSelected((prev) => new Set(prev).add(created.id));
    } catch {
      setCreateFailed(true);
    } finally {
      setCreating(null);
    }
  }

  // Create a COLLECTION from the mini-form — a named collection with a chosen visibility. Inserts it at
  // the top and selects it; closes the form. A failed create is surfaced (the form stays open to retry).
  async function createCollectionFromForm() {
    if (creating || !newForm) return;
    const title = newForm.name.trim();
    if (!title) return;
    setCreating("COLLECTION");
    setCreateFailed(false);
    try {
      const created = await createCollection({
        title,
        visibility: newForm.visibility,
        kind: "COLLECTION",
      });
      setCollections((prev) => [created, ...prev]);
      setSelected((prev) => new Set(prev).add(created.id));
      setNewForm(null);
    } catch {
      setCreateFailed(true);
    } finally {
      setCreating(null);
    }
  }

  async function connectAll() {
    if (selected.size === 0) return;
    setSaving(true);
    setFailed(false);
    const line = why.trim();
    // connectBlock is idempotent, so on a partial failure re-running all of them is safe:
    // keep the sheet open (the typed "왜" survives) and let the Add button retry.
    const results = await Promise.allSettled(
      [...selected].map((collectionId) =>
        connectBlock(collectionId, { blockType, refId, why: line || null }),
      ),
    );
    setSaving(false);
    if (results.some((r) => r.status === "rejected")) {
      setFailed(true);
      toast(t("connectedPartialToast"), "error");
      return;
    }
    // Confirm the weave and close — the toast is the completion feedback the sheet used to lack.
    toast(t("connectedToast", { count: selected.size }), "success");
    finish();
  }

  if (!mounted || !portalReady) return null;

  // Portal to <body>: a transformed/animated ancestor (a will-change page wrapper, an entering
  // article, etc.) would otherwise make this `fixed inset-0` overlay resolve against that ancestor's
  // box instead of the viewport — clipping the backdrop to a column.
  return createPortal(
    // Outer positioning shell only — no close handler on it. Outside-click close lives on the scrim
    // BUTTON below (a sibling of the sheet), not as a mousedown on a container the sheet nests inside.
    // The old nested `onMouseDown={requestClose}` + `onMouseDown stopPropagation` pair raced on touch:
    // a tap synthesises mousedown → the scrim's mousedown-close flipped `open` false → use-presence
    // began the sheet-down exit → the passage under the finger MOVED, so iOS dropped the pending
    // `click` and the row/새-컬렉션 tap did nothing. Sibling scrim + click-close (the account sheet's
    // grammar) removes the race — a tap inside the sheet never reaches the scrim at all.
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={requestClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm motion-reduce:animate-none ${
          closing ? "animate-[overlay-out_240ms_var(--ease)_both]" : "animate-fade-in"
        }`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-sheet-title"
        // Bottom sheet slides up/down on mobile (same grammar as the account sheet); the sm+
        // centered card keeps the quiet fade pair instead. `relative` lifts it above the absolute scrim.
        className={`relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl motion-reduce:animate-none dark:bg-slate-900 sm:max-w-md sm:rounded-2xl ${
          closing
            ? "animate-[sheet-down_240ms_var(--ease)_both] sm:animate-fade-out"
            : "animate-[sheet-up_280ms_var(--ease)_both] sm:animate-fade-in"
        }`}
      >
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 id="connect-sheet-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            {step === 1 ? t("connectStep1Title") : t("connectStep2Title")}
          </h3>
        </div>

        {/* Keyed on the step so the ①→② swap fades instead of snapping. */}
        <div key={step} className="flex min-h-0 flex-1 flex-col animate-fade-in">
        {step === 1 ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex justify-center py-12 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : loadFailed && collections.length === 0 ? (
                <div className="py-10 text-center" role="alert">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    {t("myCollectionsLoadError")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="focus-ring mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  >
                    {tCommon("retry")}
                  </button>
                </div>
              ) : (
                <ul>
                  {collections.map((c) => {
                    const held = heldBy.has(c.id);
                    return (
                      <li key={c.id}>
                        {held ? (
                          /* Already in — the label is inert (the unlink control on the right governs it),
                             so the row stays a div with the badge + 해제 beside it. */
                          <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left">
                            <span className="min-w-0 flex-1">
                              <CollectionRowText c={c} t={t} />
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
                                <Check className="h-3 w-3" strokeWidth={3} />
                                {t("connectedBadge")}
                              </span>
                              <button
                                type="button"
                                onClick={() => void unlink(c.id)}
                                disabled={unlinking != null}
                                className="focus-ring rounded-md px-1.5 py-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-red-400"
                              >
                                {unlinking === c.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  t("unlink")
                                )}
                              </button>
                            </span>
                          </div>
                        ) : (
                          /* One button spans the whole row — label AND the checkbox square — so a tap
                             right on the square picks the row. (The square used to be a decorative
                             sibling outside the pick button, so tapping it did nothing.) */
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={selected.has(c.id)}
                            onClick={() => toggle(c.id)}
                            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <span className="min-w-0 flex-1">
                              <CollectionRowText c={c} t={t} />
                            </span>
                            {/* Multi-select, so a checkbox square (not a radio circle) — the shape reads
                                "pick several". */}
                            <span
                              aria-hidden
                              className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                                selected.has(c.id)
                                  ? "border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {selected.has(c.id) && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                  {/* New collection — a named mini-form (name + visibility), so it's created on purpose
                      instead of silently borrowing the post's title. Closed = a plain "만들기" row. */}
                  <li>
                    {newForm ? (
                      <NewCollectionForm
                        value={newForm}
                        busy={creating === "COLLECTION"}
                        onChange={setNewForm}
                        onSubmit={() => void createCollectionFromForm()}
                        onCancel={() => {
                          setNewForm(null);
                          setCreateFailed(false);
                        }}
                      />
                    ) : (
                      <NewRow
                        icon={<Plus className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
                        label={t("newCollection")}
                        disabled={creating !== null}
                        onClick={() => setNewForm({ name: "", visibility: "PRIVATE" })}
                      />
                    )}
                  </li>
                  <li>
                    <NewRow
                      icon={<CornerDownRight className="h-3.5 w-3.5 text-accent-600 dark:text-accent-500" />}
                      label={t("newPath")}
                      hint={t("newPathHint")}
                      busy={creating === "PATH"}
                      disabled={creating !== null}
                      onClick={() => void createPathAndSelect()}
                    />
                  </li>
                  {createFailed && (
                    <li className="px-3 pb-1 pt-1">
                      <p className="text-[12px] text-red-600 dark:text-red-400" role="alert">
                        {t("createError")}
                      </p>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setStep(2)}
                className="focus-ring w-full rounded-xl bg-accent-700 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-40"
              >
                {selected.size === 0 ? t("pickToContinue") : t("next")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {targetLabel}
                </span>
                <span className="line-clamp-2 text-[14px] font-medium text-slate-700 dark:text-slate-300">
                  {targetTitle}
                </span>
              </div>
              <p className="mt-5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {t("whyLabel")}
              </p>
              <textarea
                autoFocus
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder={t("whyPlaceholder")}
                aria-label={t("whyLabel")}
                className="mt-2 w-full resize-none border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-[15px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-accent-600 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {/* Quiet remaining-length counter, right-aligned under the field (maxLength already caps it;
                  this just makes the limit legible as you approach it). Digits only — no i18n needed. */}
              <p className="mt-1 text-right text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                {why.length}/280
              </p>
              <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                {t("addToCount", { count: selected.size })}
              </p>
              {failed && (
                <p className="mt-3 text-[12px] text-red-600 dark:text-red-400" role="alert">
                  {t("connectError")}
                </p>
              )}
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="focus-ring rounded-xl px-4 py-3 text-[14px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("back")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void connectAll()}
                className="focus-ring flex flex-1 items-center justify-center rounded-xl bg-accent-700 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : failed ? tCommon("retry") : t("add")}
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The text column of a collection row — title, a recent-items preview, and the kind/visibility/count
 *  meta line. Shared by the pick button and the inert (already-in) row. */
function CollectionRowText({
  c,
  t,
}: {
  c: CollectionSummary;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
        {c.title}
      </span>
      {c.preview.length > 0 && (
        <span className="mt-0.5 block truncate text-[12px] text-slate-500 dark:text-slate-400">
          {c.preview.join(" · ")}
        </span>
      )}
      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
        {c.kind === "PATH" && (
          <>
            <CornerDownRight className="h-3 w-3 text-accent-600 dark:text-accent-500" />
            <span className="text-accent-700 dark:text-accent-400">{t("kindPath")}</span>
            <span aria-hidden>·</span>
          </>
        )}
        <VisibilityGlyph visibility={c.visibility} />
        <span>{t("itemCount", { count: c.count })}</span>
      </span>
    </>
  );
}

function NewRow({
  icon,
  label,
  hint,
  busy = false,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  /** This row's own create is in flight — swaps its glyph for a spinner. */
  busy?: boolean;
  /** Any create is in flight — the row is inert (so a double-tap can't fire two creates). */
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
    >
      <span className="grid h-5 w-5 place-items-center">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : icon}
      </span>
      <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
      {hint && <span className="text-[12px] text-slate-500 dark:text-slate-400">{hint}</span>}
    </button>
  );
}

/**
 * Inline "new collection" mini-form — a required name plus the everyday visibility pair (private /
 * public; UNLISTED stays a detail-editor choice). Replaces the plain create row so a collection is
 * named on purpose, born with the visibility you choose, instead of silently inheriting the post title.
 * "만들기" is disabled until the name is non-empty.
 */
function NewCollectionForm({
  value,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: { name: string; visibility: CollectionVisibility };
  busy: boolean;
  onChange: (v: { name: string; visibility: CollectionVisibility }) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("collections");
  const canCreate = value.name.trim().length > 0 && !busy;
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <input
        autoFocus
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canCreate) {
            e.preventDefault();
            onSubmit();
          }
        }}
        maxLength={120}
        placeholder={t("newCollectionNamePlaceholder")}
        aria-label={t("newCollectionNameLabel")}
        className="w-full border-0 border-b border-slate-200 bg-transparent px-0 py-1.5 text-[14px] font-medium text-slate-900 outline-none transition-colors focus:border-accent-600 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <NewVisibilityToggle
          value={value.visibility}
          onChange={(v) => onChange({ ...value, visibility: v })}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={onSubmit}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-800 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("create")}
          </button>
        </div>
      </div>
    </div>
  );
}

function VisibilityGlyph({ visibility }: { visibility: CollectionSummary["visibility"] }) {
  if (visibility === "PUBLIC") return <Globe className="h-3 w-3" />;
  if (visibility === "UNLISTED") return <LinkIcon className="h-3 w-3" />;
  return <Lock className="h-3 w-3" />;
}

/** A quiet private/public segmented pair governing the visibility of a collection created from this
 *  sheet — so a public collection is born public. (UNLISTED stays a detail-editor choice; the create
 *  flow keeps to the two everyday options.) */
function NewVisibilityToggle({
  value,
  onChange,
}: {
  value: CollectionVisibility;
  onChange: (v: CollectionVisibility) => void;
}) {
  const t = useTranslations("collections");
  const opts: { key: CollectionVisibility; label: string; Icon: typeof Lock }[] = [
    { key: "PRIVATE", label: t("visibilityPrivate"), Icon: Lock },
    { key: "PUBLIC", label: t("visibilityPublic"), Icon: Globe },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t("visibilityLabel")}
      className="inline-flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700/70"
    >
      {opts.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
