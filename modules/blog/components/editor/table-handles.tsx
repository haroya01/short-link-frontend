"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  MoreHorizontal,
  MoreVertical,
  Trash2,
  type LucideIcon,
} from "lucide-react";

/**
 * iPhone 메모앱식 표 편집 — 표 안에 커서가 들어가면 각 열 위에 ··· 핸들, 각 행 왼쪽에 ⋮ 핸들이 뜬다.
 * 핸들을 누르면 그 열/행을 초록으로 비추고(어디에 작용하는지 보이게) 그 자리에 앞/뒤 삽입·삭제 메뉴를
 * 연다. 기존 "표 위에 뜨는 단일 막대"를 대체한다 — 위치 기반이라 어느 열/행인지 헷갈리지 않는다.
 *
 * 핸들은 셀의 화면 좌표(getBoundingClientRect)로 그려 body 포털에 fixed 로 얹는다([[web overlay
 * portal rule]] — transform 조상에 갇히지 않게). 스크롤·리사이즈·편집마다 다시 잰다.
 */
type ColRect = { left: number; width: number; center: number };
type RowRect = { top: number; height: number; center: number };
type Geom = { table: DOMRect; cols: ColRect[]; rows: RowRect[] };
type Menu = { axis: "col" | "row"; index: number; x: number; y: number };

function findActiveTable(editor: Editor): HTMLTableElement | null {
  if (!editor.isActive("table")) return null;
  const { from } = editor.state.selection;
  let dom: Node | null = null;
  try {
    dom = editor.view.domAtPos(from).node;
  } catch {
    return null;
  }
  let el: HTMLElement | null =
    dom && dom.nodeType === Node.TEXT_NODE ? dom.parentElement : (dom as HTMLElement | null);
  return (el?.closest("table") as HTMLTableElement | null) ?? null;
}

function measure(table: HTMLTableElement): Geom | null {
  const headerRow = table.querySelector("tr");
  if (!headerRow) return null;
  const allRows = Array.from(table.querySelectorAll("tr"));
  const cols: ColRect[] = Array.from(headerRow.children).map((c) => {
    const r = (c as HTMLElement).getBoundingClientRect();
    return { left: r.left, width: r.width, center: r.left + r.width / 2 };
  });
  const rows: RowRect[] = allRows.map((tr) => {
    const r = tr.getBoundingClientRect();
    return { top: r.top, height: r.height, center: r.top + r.height / 2 };
  });
  if (!cols.length || !rows.length) return null;
  return { table: table.getBoundingClientRect(), cols, rows };
}

export function TableHandles({ editor }: { editor: Editor }) {
  const t = useTranslations("postEditor.table");
  const [geom, setGeom] = useState<Geom | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const recompute = useCallback(() => {
    const table = findActiveTable(editor);
    tableRef.current = table;
    if (!table) {
      setGeom(null);
      setMenu(null);
      return;
    }
    setGeom(measure(table));
  }, [editor]);

  const schedule = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(recompute);
  }, [recompute]);

  useEffect(() => {
    schedule();
    editor.on("transaction", schedule);
    editor.on("selectionUpdate", schedule);
    // capture=true so the editor's own scroll container (not just window) re-measures.
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      editor.off("transaction", schedule);
      editor.off("selectionUpdate", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, schedule]);

  // Drop the caret into the target column/row's cell, then the table command acts on it.
  function actOn(axis: "col" | "row", index: number, command: () => boolean) {
    const table = tableRef.current;
    if (!table) return;
    let cell: HTMLElement | undefined;
    if (axis === "col") {
      cell = table.querySelector("tr")?.children[index] as HTMLElement | undefined;
    } else {
      cell = (table.querySelectorAll("tr")[index]?.children[0] as HTMLElement) || undefined;
    }
    if (!cell) return;
    let pos: number;
    try {
      pos = editor.view.posAtDOM(cell, 0);
    } catch {
      return;
    }
    if (pos < 0) return;
    const at = Math.min(pos + 1, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(at).run();
    command();
    setMenu(null);
  }

  function openMenu(axis: "col" | "row", index: number, e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    // Anchor the menu just inside the table edge so it never opens off-screen on a phone.
    setMenu({
      axis,
      index,
      x: axis === "col" ? Math.max(8, r.left - 4) : r.right + 6,
      y: axis === "col" ? r.bottom + 6 : Math.max(8, r.top - 4),
    });
  }

  if (!geom) return null;

  const HANDLE =
    "pointer-events-auto absolute grid place-items-center rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400";

  const colItems: { icon: LucideIcon; label: string; run: () => boolean; danger?: boolean }[] = [
    { icon: ArrowLeftToLine, label: t("insertColumnLeft"), run: () => editor.commands.addColumnBefore() },
    { icon: ArrowRightToLine, label: t("insertColumnRight"), run: () => editor.commands.addColumnAfter() },
    { icon: Trash2, label: t("deleteColumn"), run: () => editor.commands.deleteColumn(), danger: true },
  ];
  const rowItems: { icon: LucideIcon; label: string; run: () => boolean; danger?: boolean }[] = [
    { icon: ArrowUpToLine, label: t("insertRowAbove"), run: () => editor.commands.addRowBefore() },
    { icon: ArrowDownToLine, label: t("insertRowBelow"), run: () => editor.commands.addRowAfter() },
    { icon: Trash2, label: t("deleteRow"), run: () => editor.commands.deleteRow(), danger: true },
  ];
  const items = menu?.axis === "col" ? colItems : rowItems;
  const activeBand =
    menu &&
    (menu.axis === "col"
      ? { left: geom.cols[menu.index]?.left, top: geom.table.top, width: geom.cols[menu.index]?.width, height: geom.table.height }
      : { left: geom.table.left, top: geom.rows[menu.index]?.top, width: geom.table.width, height: geom.rows[menu.index]?.height });

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Column handles — a ··· grip centred above each column. */}
      {geom.cols.map((c, i) => (
        <button
          key={`col-${i}`}
          type="button"
          aria-label={t("column")}
          title={t("column")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => openMenu("col", i, e)}
          className={HANDLE}
          style={{ left: c.center - 11, top: geom.table.top - 18, width: 22, height: 14 }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      ))}
      {/* Row handles — a ⋮ grip centred to the left of each row. */}
      {geom.rows.map((r, i) => (
        <button
          key={`row-${i}`}
          type="button"
          aria-label={t("row")}
          title={t("row")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => openMenu("row", i, e)}
          className={HANDLE}
          style={{ left: geom.table.left - 18, top: r.center - 11, width: 14, height: 22 }}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      ))}

      {/* The column/row about to be acted on, lit green so it's obvious what the menu targets. */}
      {menu && activeBand && activeBand.left != null && (
        <div
          className="pointer-events-none absolute rounded-sm bg-emerald-400/15 ring-1 ring-emerald-400/40"
          style={{ left: activeBand.left, top: activeBand.top, width: activeBand.width, height: activeBand.height }}
        />
      )}

      {menu && (
        <>
          <div className="pointer-events-auto fixed inset-0 z-40" onMouseDown={() => setMenu(null)} />
          <div
            role="menu"
            className="pointer-events-auto fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            style={{ left: menu.x, top: menu.y }}
          >
            <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {menu.axis === "col" ? t("column") : t("row")}
            </p>
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onMouseDown={(e) => {
                  e.preventDefault();
                  actOn(menu.axis, menu.index, it.run);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
                  it.danger
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <it.icon className={`h-4 w-4 shrink-0 ${it.danger ? "" : "text-slate-400 dark:text-slate-500"}`} />
                {it.label}
              </button>
            ))}
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().deleteTable().run();
                setMenu(null);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {t("deleteTable")}
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
