"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogLink } from "@/modules/blog/components/blog-link";
import {
  createNoteList,
  deleteNoteList,
  listNoteListMembers,
  listNoteListNotes,
  listNoteLists,
  renameNoteList,
  setNoteListMember,
  type NoteAuthor,
  type NoteListSummary,
} from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

const chip =
  "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors";

export function NoteListsPanel({ selectedId }: { selectedId: number | null }) {
  const t = useTranslations("notes");
  const pathname = usePathname();
  const { toast } = useToast();
  const [lists, setLists] = useState<NoteListSummary[] | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let live = true;
    listNoteLists()
      .then((loaded) => live && setLists(loaded))
      .catch(() => live && setLists([]));
    return () => {
      live = false;
    };
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const created = await createNoteList(trimmed);
      setLists((current) => [...(current ?? []), created]);
      setTitle("");
    } catch {
      toast(t("listFailed"), "error");
    }
  }

  const selected = lists?.find((list) => list.id === selectedId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 py-3">
        {lists?.map((list) => (
          <BlogLink
            key={list.id}
            href={`${pathname}?feed=lists&list=${list.id}`}
            aria-current={list.id === selectedId ? "page" : undefined}
            className={cn(
              chip,
              list.id === selectedId
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200",
            )}
          >
            {list.title}
            <span className="tabular-nums opacity-60">{list.memberCount}</span>
          </BlogLink>
        ))}
        <form onSubmit={create} className="flex items-center gap-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            placeholder={t("listNewTitle")}
            aria-label={t("listNewTitle")}
            className="focus-ring w-36 rounded-full border border-dashed border-slate-300 bg-transparent px-3 py-1 text-[13px] text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="focus-ring rounded-full px-2 py-1 text-[13px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-40 dark:text-slate-300"
          >
            {t("listCreate")}
          </button>
        </form>
      </div>
      {selected ? (
        <ListDetail
          key={selected.id}
          list={selected}
          onChange={(next) => setLists((current) => current?.map((l) => (l.id === next.id ? next : l)) ?? null)}
          onDeleted={() => setLists((current) => current?.filter((l) => l.id !== selected.id) ?? null)}
        />
      ) : (
        lists && <EmptyState title={lists.length ? t("listPick") : t("listEmpty")} className="mt-6" />
      )}
    </div>
  );
}

function ListDetail({
  list,
  onChange,
  onDeleted,
}: {
  list: NoteListSummary;
  onChange: (list: NoteListSummary) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [members, setMembers] = useState<NoteAuthor[] | null>(null);
  const load = useCallback((page: number) => listNoteListNotes(list.id, page), [list.id]);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    try {
      onChange(await renameNoteList(list.id, title.trim()));
      setRenaming(false);
    } catch {
      toast(t("listFailed"), "error");
    }
  }

  async function remove() {
    if (!(await confirm({ title: t("listDeleteConfirm"), confirmLabel: t("delete"), destructive: true }))) return;
    try {
      await deleteNoteList(list.id);
      onDeleted();
    } catch {
      toast(t("listFailed"), "error");
    }
  }

  async function showMembers() {
    if (members) {
      setMembers(null);
      return;
    }
    setMembers(await listNoteListMembers(list.id).catch(() => []));
  }

  async function drop(member: NoteAuthor) {
    try {
      await setNoteListMember(list.id, member.username, false);
      setMembers((current) => current?.filter((m) => m.id !== member.id) ?? null);
      onChange({ ...list, memberCount: Math.max(list.memberCount - 1, 0) });
    } catch {
      toast(t("listFailed"), "error");
    }
  }

  const action =
    "focus-ring rounded px-1.5 py-0.5 text-[13px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100";
  return (
    <section aria-label={list.title}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        {renaming ? (
          <form onSubmit={rename} className="flex items-center gap-1.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              autoFocus
              aria-label={t("listRename")}
              className="focus-ring rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[15px] dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" disabled={!title.trim()} className={action}>
              {t("save")}
            </button>
          </form>
        ) : (
          <h2 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">{list.title}</h2>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={showMembers} aria-expanded={members !== null} className={action}>
            {t("listMembers", { count: list.memberCount })}
          </button>
          {!renaming && (
            <button type="button" onClick={() => setRenaming(true)} className={action}>
              {t("listRename")}
            </button>
          )}
          <button type="button" onClick={remove} className={cn(action, "hover:text-red-600")}>
            {t("delete")}
          </button>
        </div>
      </div>
      {members && (
        <ul className="divide-y divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {members.length === 0 && <li className="py-3 text-[13px] text-slate-500">{t("listNoMembers")}</li>}
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 py-2.5">
              <Avatar src={member.avatarUrl} name={member.username} size="sm" />
              <span className="flex-1 truncate text-[14px] text-slate-900 dark:text-slate-100">{member.username}</span>
              <button type="button" onClick={() => drop(member)} className={action}>
                {t("listRemoveMember")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <NoteList
        load={load}
        filterContext="home"
        empty={<EmptyState title={t("listNoNotes")} className="mt-6" />}
      />
      {confirmDialog}
    </section>
  );
}
