"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CornerDownRight, Globe, Link as LinkIcon, Loader2, Lock, Plus } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import {
  connectBlock,
  createCollection,
  listMyCollections,
  type CollectionSummary,
  type ConnectionBlockType,
} from "@/modules/blog/api/collections";

/**
 * "연결" — the verb. Connect a block (post / highlight / note) to a collection or PATH (not broadcast).
 * Two depths: ① where to file it (pick collections, or create a new collection / path) → ② add (the
 * one-line "왜" + confirm). The "왜" is what separates a collection from a plain bookmark, so it gets
 * its own focused moment after picking. A bottom sheet (mobile) / centered card (sm+).
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
  /** The target's text (the quote / title) — shown in step 2 and used to name a new collection. */
  targetTitle: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("collections");
  const [step, setStep] = useState<1 | 2>(1);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [why, setWhy] = useState("");
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // The parent unmounts this component on onClose/onDone, so the exit phase has to be owned here:
  // closing flips `open` false, use-presence plays the sheet-down/fade exit, and only when it
  // unmounts do we hand control back to the parent (which then drops the whole subtree).
  const [open, setOpen] = useState(true);
  const { mounted, closing } = usePresence(open, 240);
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
    listMyCollections()
      .then((list) => alive && setCollections(list))
      .catch(() => alive && setCollections([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Keyboard containment: Escape + Tab cycling within the sheet + focus restore to the opener. Step 2
  // places its own initial focus (the 왜 textarea autoFocuses), so don't fight it.
  useFocusTrap(sheetRef, { active: open, onEscape: requestClose, autoFocus: step === 1 });

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createAndSelect(kind: "COLLECTION" | "PATH") {
    const fallback = kind === "PATH" ? t("newPathFallback") : t("newCollectionFallback");
    const title = targetTitle.trim().slice(0, 60) || fallback;
    try {
      const created = await createCollection({ title, visibility: "PRIVATE", kind });
      setCollections((prev) => [created, ...prev]);
      setSelected((prev) => new Set(prev).add(created.id));
    } catch {
      /* swallow — the row just won't appear */
    }
  }

  async function connectAll() {
    if (selected.size === 0) return;
    setSaving(true);
    const line = why.trim();
    await Promise.allSettled(
      [...selected].map((collectionId) =>
        connectBlock(collectionId, { blockType, refId, why: line || null }),
      ),
    );
    setSaving(false);
    finish();
  }

  if (!mounted) return null;

  return (
    // Backdrop fades in with the sheet and back out on close (the exit rides the same container).
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm motion-reduce:animate-none sm:items-center sm:p-4 ${
        closing ? "animate-[overlay-out_240ms_var(--ease)_both]" : "animate-fade-in"
      }`}
      onMouseDown={requestClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-sheet-title"
        // Bottom sheet slides up/down on mobile (same grammar as the account sheet); the sm+
        // centered card keeps the quiet fade pair instead.
        className={`flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl motion-reduce:animate-none dark:bg-slate-900 sm:max-w-md sm:rounded-2xl ${
          closing
            ? "animate-[sheet-down_240ms_var(--ease)_both] sm:animate-fade-out"
            : "animate-[sheet-up_280ms_var(--ease)_both] sm:animate-fade-in"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
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
              ) : (
                <ul>
                  {collections.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
                            {c.title}
                          </span>
                          {c.preview.length > 0 && (
                            <span className="mt-0.5 block truncate text-[12px] text-slate-500 dark:text-slate-400">
                              {c.preview.join(" · ")}
                            </span>
                          )}
                          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-400 dark:text-slate-500">
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
                        </span>
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                            selected.has(c.id)
                              ? "border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {selected.has(c.id) && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <NewRow
                      icon={<Plus className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
                      label={t("newCollection")}
                      onClick={() => createAndSelect("COLLECTION")}
                    />
                  </li>
                  <li>
                    <NewRow
                      icon={<CornerDownRight className="h-3.5 w-3.5 text-accent-600 dark:text-accent-500" />}
                      label={t("newPath")}
                      hint={t("newPathHint")}
                      onClick={() => createAndSelect("PATH")}
                    />
                  </li>
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
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {targetLabel}
                </span>
                <span className="line-clamp-2 text-[14px] font-medium text-slate-700 dark:text-slate-300">
                  {targetTitle}
                </span>
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
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
                className="mt-2 w-full resize-none border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-[15px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-accent-500 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">
                {t("addToCount", { count: selected.size })}
              </p>
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
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function NewRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
      {hint && <span className="text-[12px] text-slate-400 dark:text-slate-500">{hint}</span>}
    </button>
  );
}

function VisibilityGlyph({ visibility }: { visibility: CollectionSummary["visibility"] }) {
  if (visibility === "PUBLIC") return <Globe className="h-3 w-3" />;
  if (visibility === "UNLISTED") return <LinkIcon className="h-3 w-3" />;
  return <Lock className="h-3 w-3" />;
}
