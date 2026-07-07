"use client";

import { DATE_LOCALE } from "@/lib/date";
import { useRef, useState } from "react";
import { Check, FolderPlus, MoreHorizontal, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { authorHref, postHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import type { BookmarkFolder, SavedPost } from "@/modules/blog/api/saved";


/**
 * One saved/bookmarked post in the 보관함 shelf — same quiet typographic grammar as a feed card (tag
 * eyebrow → title → excerpt → author·date), plus a "⋯" menu to file it into a folder, pull it out, or
 * remove it. Purpose-built (not FeedCard) because the folder control is specific to the owner's shelf.
 */
export function SavedCard({
  item,
  folders,
  locale,
  onMove,
  onRemove,
  onCreateFolder,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  item: SavedPost;
  folders: BookmarkFolder[];
  locale: string;
  onMove: (postId: number, folderId: number | null) => void;
  onRemove: (postId: number) => void;
  onCreateFolder: (name: string, thenMovePostId: number) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (postId: number) => void;
}) {
  const t = useTranslations("savedLibrary");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const date = new Date(item.publishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  function submitNew() {
    const n = name.trim();
    if (!n) return;
    onCreateFolder(n, item.id);
    setName("");
    setAdding(false);
    setOpen(false);
  }

  const body = (
    <>
      {item.tags[0] && (
        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{item.tags[0]}</span>
      )}
      <h3 className={`mt-0.5 line-clamp-2 pr-8 text-[17px] font-semibold leading-snug tracking-tight text-slate-900 transition-colors dark:text-slate-100 ${selectMode ? "" : "group-hover/saved:text-accent-700 dark:group-hover/saved:text-accent-400"}`}>
        {item.title}
      </h3>
      {item.excerpt && (
        <p className="mt-1 line-clamp-1 text-[13px] text-slate-500 dark:text-slate-400">{item.excerpt}</p>
      )}
    </>
  );

  return (
    <article
      className={`group/saved relative rounded-xl transition-colors ${selectMode ? "focus-ring -mx-3 cursor-pointer select-none px-3 py-2" : ""} ${selected ? "bg-accent-50/70 dark:bg-accent-500/10" : ""}`}
      onClick={selectMode ? () => onToggleSelect?.(item.id) : undefined}
      role={selectMode ? "checkbox" : undefined}
      aria-checked={selectMode ? selected : undefined}
      aria-label={selectMode ? item.title : undefined}
      tabIndex={selectMode ? 0 : undefined}
      onKeyDown={
        selectMode
          ? (e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onToggleSelect?.(item.id);
              }
            }
          : undefined
      }
    >
      {selectMode ? (
        <div>{body}</div>
      ) : (
        <BlogLink href={postHref(item.author.username, item.slug, locale)} className="focus-ring block rounded">
          {body}
        </BlogLink>
      )}
      <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        {selectMode ? (
          <span className="font-medium">{item.author.username}</span>
        ) : (
          <BlogLink href={authorHref(item.author.username, locale)} className="focus-ring rounded font-medium hover:text-accent-700 dark:hover:text-accent-400">
            {item.author.username}
          </BlogLink>
        )}
        <span aria-hidden>·</span>
        <span>{date}</span>
      </div>

      {/* Select-mode checkbox (replaces the ⋯ menu). */}
      {selectMode && (
        <span
          aria-hidden
          className={`absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-md border transition-colors ${
            selected
              ? "border-accent-600 bg-accent-700 text-white"
              : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
          }`}
        >
          {selected && <Check className="h-4 w-4" />}
        </span>
      )}

      {/* Folder / remove menu — hidden in select mode. */}
      {!selectMode && (
      <div className="absolute right-0 top-0" ref={ref}>
        <button
          type="button"
          aria-label={t("manage")}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t("moveTo")}</p>
            <button type="button" onClick={() => { onMove(item.id, null); setOpen(false); }} className={menuItem}>
              <span className="flex-1 text-left">{t("unfiled")}</span>
              {item.folderId == null && <Check className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />}
            </button>
            {folders.map((f) => (
              <button key={f.id} type="button" onClick={() => { onMove(item.id, f.id); setOpen(false); }} className={menuItem}>
                <span className="flex-1 truncate text-left">{f.name}</span>
                {item.folderId === f.id && <Check className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" />}
              </button>
            ))}
            {adding ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNew(); }}
                  placeholder={t("newFolderName")}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button type="button" onClick={submitNew} aria-label={t("create")} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-accent-700 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className={`${menuItem} text-accent-700 dark:text-accent-400`}>
                <FolderPlus className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{t("newFolder")}</span>
              </button>
            )}
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button type="button" onClick={() => { onRemove(item.id); setOpen(false); }} className={`${menuItem} text-red-600 dark:text-red-400`}>
              <X className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">{t("remove")}</span>
            </button>
          </div>
        )}
      </div>
      )}
    </article>
  );
}

const menuItem =
  "flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60";
