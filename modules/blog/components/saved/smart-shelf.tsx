"use client";

import { useEffect, useMemo, useState } from "react";
import { Folder, FolderPlus, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import {
  type BookmarkFolder,
  type SavedPost,
  createFolder as apiCreateFolder,
  listFolders,
  listSavedFeed,
  moveSavedToFolder,
  removeSaved,
} from "@/modules/blog/api/saved";
import { SavedCard } from "@/modules/blog/components/saved/saved-card";

/**
 * 스마트 셸프 — the owner's bookmarks, hybrid-organized: manual folders the user makes, plus the
 * leftover (unfiled) bookmarks auto-grouped by their topic tag, so there's structure with zero effort
 * and full control when wanted. A folder bar filters; each card's menu files / pulls / removes it.
 * Owner-only (private): renders nothing for other viewers.
 */
export function SmartShelf({ username, locale }: { username: string; locale: string }) {
  const t = useTranslations("savedLibrary");
  const { ready, me } = useAuth();
  const isOwner = ready && me?.username === username;

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedPost[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selected, setSelected] = useState<number | "all">("all");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!isOwner) return;
    let alive = true;
    Promise.all([listSavedFeed(), listFolders()])
      .then(([s, f]) => {
        if (!alive) return;
        setSaved(s);
        setFolders(f);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isOwner]);

  const recount = (list: SavedPost[]): BookmarkFolder[] =>
    folders.map((f) => ({ ...f, count: list.filter((s) => s.folderId === f.id).length }));

  function move(postId: number, folderId: number | null) {
    setSaved((prev) => {
      const next = prev.map((s) => (s.id === postId ? { ...s, folderId } : s));
      setFolders(recount(next));
      return next;
    });
    void moveSavedToFolder(postId, folderId);
  }
  function remove(postId: number) {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== postId);
      setFolders(recount(next));
      return next;
    });
    void removeSaved(postId);
  }
  async function addFolder(name: string, thenMovePostId?: number) {
    const f = await apiCreateFolder(name);
    setFolders((prev) => [...prev, { ...f, count: 0 }]);
    if (thenMovePostId != null) move(thenMovePostId, f.id);
  }

  const unfiled = useMemo(() => saved.filter((s) => s.folderId == null), [saved]);
  const autoSections = useMemo(() => {
    const m = new Map<string, SavedPost[]>();
    for (const s of unfiled) {
      const key = s.tags[0] ?? t("untagged");
      m.set(key, [...(m.get(key) ?? []), s]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [unfiled, t]);

  if (ready && !isOwner) {
    return <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("private")}</p>;
  }
  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (saved.length === 0) {
    return <p className="py-16 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("emptyBookmarks")}</p>;
  }

  const cardProps = { folders, locale, onMove: move, onRemove: remove, onCreateFolder: addFolder };
  const selectedFolder = typeof selected === "number" ? folders.find((f) => f.id === selected) : null;
  const selectedItems = typeof selected === "number" ? saved.filter((s) => s.folderId === selected) : [];

  return (
    <div>
      {/* Folder filter bar */}
      <div className="mb-7 flex flex-wrap items-center gap-2">
        <FolderPill active={selected === "all"} onClick={() => setSelected("all")} label={t("all")} count={saved.length} />
        {folders.map((f) => (
          <FolderPill
            key={f.id}
            active={selected === f.id}
            onClick={() => setSelected(f.id)}
            label={f.name}
            count={f.count}
            icon
          />
        ))}
        {adding ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-1 py-0.5 dark:border-slate-700">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  void addFolder(newName.trim());
                  setNewName("");
                  setAdding(false);
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                }
              }}
              placeholder={t("newFolderName")}
              className="w-28 bg-transparent px-2 py-0.5 text-[13px] text-slate-900 outline-none dark:text-slate-100"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="focus-ring inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:border-accent-400 hover:text-accent-700 dark:border-slate-600 dark:text-slate-400 dark:hover:border-accent-500 dark:hover:text-accent-400"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {t("newFolder")}
          </button>
        )}
      </div>

      {/* A single folder selected → just its items */}
      {typeof selected === "number" ? (
        <Section icon={<Folder className="h-3.5 w-3.5" />} title={selectedFolder?.name ?? ""}>
          {selectedItems.length === 0 ? (
            <p className="text-[13px] text-slate-400 dark:text-slate-500">{t("emptyFolder")}</p>
          ) : (
            selectedItems.map((it) => <SavedCard key={it.id} item={it} {...cardProps} />)
          )}
        </Section>
      ) : (
        <div className="flex flex-col gap-10">
          {/* Manual folders first */}
          {folders
            .filter((f) => saved.some((s) => s.folderId === f.id))
            .map((f) => (
              <Section key={f.id} icon={<Folder className="h-3.5 w-3.5" />} title={f.name}>
                {saved.filter((s) => s.folderId === f.id).map((it) => <SavedCard key={it.id} item={it} {...cardProps} />)}
              </Section>
            ))}
          {/* Auto-grouped leftovers */}
          {autoSections.map(([tag, items]) => (
            <Section key={tag} icon={<Sparkles className="h-3.5 w-3.5" />} title={tag} hint={t("autoGrouped")}>
              {items.map((it) => <SavedCard key={it.id} item={it} {...cardProps} />)}
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderPill({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-accent-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-accent-50 hover:text-accent-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-accent-500/15 dark:hover:text-accent-400"
      }`}
    >
      {icon && <Folder className="h-3.5 w-3.5" />}
      {label}
      <span className={active ? "text-white/70" : "text-slate-400 dark:text-slate-500"}>{count}</span>
    </button>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-1.5 text-[13px] font-bold text-slate-800 dark:text-slate-200">
        <span className="text-accent-500">{icon}</span>
        {title}
        {hint && <span className="font-medium text-slate-400 dark:text-slate-500">· {hint}</span>}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
