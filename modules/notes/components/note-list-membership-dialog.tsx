"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/components/ui/toast";
import {
  createNoteList,
  listNoteListMemberships,
  listNoteLists,
  setNoteListMember,
  type NoteListSummary,
} from "@/modules/notes/api/notes";

export function NoteListMembershipDialog({
  username,
  open,
  onClose,
}: {
  username: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [lists, setLists] = useState<NoteListSummary[] | null>(null);
  const [inLists, setInLists] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState("");
  const { mounted: present, closing } = usePresence(open, 160);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([listNoteLists(), listNoteListMemberships(username)])
      .then(([loaded, membership]) => {
        if (!live) return;
        setLists(loaded);
        setInLists(new Set(membership.listIds));
      })
      .catch(() => live && setLists([]));
    return () => {
      live = false;
    };
  }, [open, username]);

  useFocusTrap(panel, { active: open, onEscape: onClose, autoFocus: true });

  async function toggle(list: NoteListSummary) {
    const on = !inLists.has(list.id);
    try {
      await setNoteListMember(list.id, username, on);
      setInLists((current) => {
        const next = new Set(current);
        if (on) next.add(list.id);
        else next.delete(list.id);
        return next;
      });
    } catch {
      toast(t("listFailed"), "error");
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const created = await createNoteList(trimmed);
      setLists((current) => [...(current ?? []), created]);
      setTitle("");
      await setNoteListMember(created.id, username, true);
      setInLists((current) => new Set(current).add(created.id));
    } catch {
      toast(t("listFailed"), "error");
    }
  }

  if (!present || !mounted) return null;

  return createPortal(
    <div
      aria-hidden={closing || undefined}
      className={cn("fixed inset-0 z-50 overflow-y-auto px-4 pt-12 sm:pt-20", closing && "pointer-events-none")}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn("fixed inset-0 scrim", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative mx-auto w-full max-w-sm rounded-surface border border-slate-200 bg-white shadow-modal dark:border-slate-800 dark:bg-slate-850",
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 id={titleId} className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
            {t("addToListTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded px-1 text-[15px] text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            {t("close")}
          </button>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {lists?.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={inLists.has(list.id)}
                onClick={() => toggle(list)}
                className="focus-ring flex w-full items-center justify-between rounded-surface px-3 py-2.5 text-left text-[14px] text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {list.title}
                {inLists.has(list.id) && <Check className="h-4 w-4 text-accent-700 dark:text-accent-400" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={createAndAdd} className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            placeholder={t("listNewTitle")}
            aria-label={t("listNewTitle")}
            className="focus-ring min-w-0 flex-1 rounded-surface border border-slate-300 bg-transparent px-2.5 py-1.5 text-[14px] dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="focus-ring shrink-0 rounded-full bg-accent-700 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-800 disabled:opacity-40"
          >
            {t("listCreateAndAdd")}
          </button>
        </form>
        <p className="px-4 pb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("listPrivateHint", { username })}</p>
      </div>
    </div>,
    document.body,
  );
}
