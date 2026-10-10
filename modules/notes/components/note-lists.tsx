"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { blogPath } from "@/lib/host";
import { List, MessageSquareText } from "lucide-react";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
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

export const NOTE_LISTS_SETTINGS = blogPath("/settings#lists");

export function NoteListTimeline({ list }: { list: NoteListSummary }) {
  const t = useTranslations("notes");
  const load = useCallback((page: number) => listNoteListNotes(list.id, page), [list.id]);
  return (
    <section aria-label={list.title}>
      <div className="flex justify-end py-2">
        <BlogLink
          href={NOTE_LISTS_SETTINGS}
          className="focus-ring rounded text-[13px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t("listManage")}
        </BlogLink>
      </div>
      <NoteList key={list.id} load={load} filterContext="home" empty={<BlogEmpty icon={MessageSquareText} title={t("listNoNotes")} />} />
    </section>
  );
}

export function NoteListUnpicked({ hasLists }: { hasLists: boolean }) {
  const t = useTranslations("notes");
  return (
    <BlogEmpty
      icon={List}
      title={hasLists ? t("listPick") : t("listEmpty")}
      body={hasLists ? undefined : t("listEmptyBody")}
      action={
        <BlogLink
          href={NOTE_LISTS_SETTINGS}
          className="focus-ring rounded text-[13px] font-semibold text-accent-700 hover:underline dark:text-accent-400"
        >
          {t("listManage")}
        </BlogLink>
      }
    />
  );
}

export function NoteListSettings() {
  const t = useTranslations("notes");
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

  return (
    <section id="lists" aria-labelledby="note-lists-title" className="mt-8 scroll-mt-24">
      <h2 id="note-lists-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("feedLists")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("listSettingsHint")}</p>
      {lists && lists.length === 0 && (
        <p className="rounded-surface border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("listEmpty")}
        </p>
      )}
      {lists && lists.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-surface border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
          {lists.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              onChange={(next) => setLists((current) => current?.map((l) => (l.id === next.id ? next : l)) ?? null)}
              onDeleted={() => setLists((current) => current?.filter((l) => l.id !== list.id) ?? null)}
            />
          ))}
        </ul>
      )}
      <form onSubmit={create} className="mt-3 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={50}
          placeholder={t("listNewTitle")}
          aria-label={t("listNewTitle")}
          className="focus-ring min-w-0 flex-1 rounded-surface border border-slate-300 bg-transparent px-2.5 py-1.5 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="focus-ring rounded-full px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-40 dark:text-slate-300"
        >
          {t("listCreate")}
        </button>
      </form>
    </section>
  );
}

function ListRow({
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
    <li aria-label={list.title} className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        {renaming ? (
          <form onSubmit={rename} className="flex items-center gap-1.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              autoFocus
              aria-label={t("listRename")}
              className="focus-ring rounded-surface border border-slate-300 bg-white px-2.5 py-1 text-[14px] dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" disabled={!title.trim()} className={action}>
              {t("save")}
            </button>
          </form>
        ) : (
          <span className="min-w-0 truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">{list.title}</span>
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
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {members.length === 0 && <li className="py-2 text-[13px] text-slate-500">{t("listNoMembers")}</li>}
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 py-2">
              <Avatar src={member.avatarUrl} name={member.username} size="sm" />
              <span className="flex-1 truncate text-[14px] text-slate-900 dark:text-slate-100">{member.username}</span>
              <button type="button" onClick={() => drop(member)} className={action}>
                {t("listRemoveMember")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </li>
  );
}
