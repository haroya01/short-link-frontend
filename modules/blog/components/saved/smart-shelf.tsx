"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Folder, FolderPlus, ListChecks, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useDismiss } from "@/hooks/use-dismiss";
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
  // 다중선택 — 여러 글을 한 폴더(또는 새 폴더)로 한 번에 옮기는 모드.
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());

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

  // 일괄 이동 — 선택된 글들을 한 번에 folderId 로. extraFolder 가 있으면(새 폴더) 카운트 계산에 포함.
  function applyBulkMove(ids: number[], folderId: number | null, extraFolder?: BookmarkFolder) {
    setSaved((prev) => {
      const next = prev.map((s) => (ids.includes(s.id) ? { ...s, folderId } : s));
      setFolders((prevF) => {
        const base = extraFolder ? [...prevF, extraFolder] : prevF;
        return base.map((f) => ({ ...f, count: next.filter((s) => s.folderId === f.id).length }));
      });
      return next;
    });
    ids.forEach((id) => void moveSavedToFolder(id, folderId));
  }
  function togglePick(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function exitSelect() {
    setSelectMode(false);
    setPicked(new Set());
  }
  function bulkMove(folderId: number | null) {
    applyBulkMove([...picked], folderId);
    exitSelect();
  }
  async function bulkNewFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const f = await apiCreateFolder(trimmed);
    applyBulkMove([...picked], f.id, { ...f, count: 0 });
    exitSelect();
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

  const cardProps = {
    folders,
    locale,
    onMove: move,
    onRemove: remove,
    onCreateFolder: addFolder,
    selectMode,
    onToggleSelect: togglePick,
  };
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
        {/* 다중선택 토글 — 여러 글을 한 폴더로 한 번에 옮기고 싶을 때. */}
        <button
          type="button"
          onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          aria-pressed={selectMode}
          className={`focus-ring ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
            selectMode
              ? "bg-accent-600 text-white"
              : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          }`}
        >
          <ListChecks className="h-3.5 w-3.5" />
          {selectMode ? t("selectCancel") : t("select")}
        </button>
      </div>

      {/* A single folder selected → just its items */}
      {typeof selected === "number" ? (
        <Section icon={<Folder className="h-3.5 w-3.5" />} title={selectedFolder?.name ?? ""}>
          {selectedItems.length === 0 ? (
            <p className="text-[13px] text-slate-400 dark:text-slate-500">{t("emptyFolder")}</p>
          ) : (
            selectedItems.map((it) => <SavedCard key={it.id} item={it} selected={picked.has(it.id)} {...cardProps} />)
          )}
        </Section>
      ) : (
        <div className="flex flex-col gap-10">
          {/* Manual folders first */}
          {folders
            .filter((f) => saved.some((s) => s.folderId === f.id))
            .map((f) => (
              <Section key={f.id} icon={<Folder className="h-3.5 w-3.5" />} title={f.name}>
                {saved.filter((s) => s.folderId === f.id).map((it) => <SavedCard key={it.id} item={it} selected={picked.has(it.id)} {...cardProps} />)}
              </Section>
            ))}
          {/* Auto-grouped leftovers */}
          {autoSections.map(([tag, items]) => (
            <Section key={tag} icon={<Sparkles className="h-3.5 w-3.5" />} title={tag} hint={t("autoGrouped")}>
              {items.map((it) => <SavedCard key={it.id} item={it} selected={picked.has(it.id)} {...cardProps} />)}
            </Section>
          ))}
        </div>
      )}

      {/* 선택된 글이 있으면 떠오르는 일괄 이동 바. */}
      {selectMode && picked.size > 0 && (
        <BulkBar count={picked.size} folders={folders} onMove={bulkMove} onNewFolder={bulkNewFolder} />
      )}
    </div>
  );
}

function BulkBar({
  count,
  folders,
  onMove,
  onNewFolder,
}: {
  count: number;
  folders: BookmarkFolder[];
  onMove: (folderId: number | null) => void;
  onNewFolder: (name: string) => void;
}) {
  const t = useTranslations("savedLibrary");
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(menuOpen, ref, () => setMenuOpen(false));

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1.5 pl-4 pr-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {t("selectedCount", { count })}
      </span>
      {/* 폴더로 이동 */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="focus-ring inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t("moveTo")}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute bottom-full right-0 mb-2 max-h-64 w-48 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <button type="button" onClick={() => onMove(null)} className={bulkMenuItem}>
              {t("unfiled")}
            </button>
            {folders.map((f) => (
              <button key={f.id} type="button" onClick={() => onMove(f.id)} className={bulkMenuItem}>
                <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="flex-1 truncate text-left">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* 새 폴더로 */}
      {adding ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-300 px-1 py-0.5 dark:border-accent-500/40">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onNewFolder(name.trim());
              else if (e.key === "Escape") {
                setAdding(false);
                setName("");
              }
            }}
            placeholder={t("newFolderName")}
            className="w-24 bg-transparent px-2 py-0.5 text-[13px] text-slate-900 outline-none dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => name.trim() && onNewFolder(name.trim())}
            aria-label={t("create")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-accent-700 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
          >
            <Check className="h-4 w-4" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="focus-ring inline-flex items-center gap-1 rounded-full bg-accent-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-700"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          {t("newFolderTo")}
        </button>
      )}
    </div>
  );
}

const bulkMenuItem =
  "flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60";

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
