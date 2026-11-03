"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorState, type Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { Check, Info, Lightbulb, MessageSquareWarning, OctagonAlert, Star, TriangleAlert, type LucideIcon } from "lucide-react";
import type { CalloutKind } from "@/modules/blog/lib/callout";
import { usePresence } from "@/hooks/use-presence";

export const CALLOUT_CHOICES: { kind: CalloutKind; icon: LucideIcon; labelKey: string }[] = [
  { kind: "note", icon: Info, labelKey: "calloutNote" },
  { kind: "tip", icon: Lightbulb, labelKey: "calloutTip" },
  { kind: "important", icon: Star, labelKey: "calloutImportant" },
  { kind: "warning", icon: TriangleAlert, labelKey: "calloutWarning" },
  { kind: "caution", icon: OctagonAlert, labelKey: "calloutCaution" },
];

export function toggleCallout(editor: Editor, kind: CalloutKind) {
  if (editor.isActive("blockquote", { alert: kind })) editor.chain().focus().toggleBlockquote().run();
  else editor.chain().focus().setCallout(kind).run();
}

const MENU_W = 176;
const ITEM_SELECTOR = '[role="menuitemradio"]';

export function CalloutMenuButton({ editor, className }: { editor: Editor; className: (active: boolean) => string }) {
  const t = useTranslations("postEditor.slash");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const { mounted, closing } = usePresence(open, 160);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor.isActive("blockquote") ? ((editor.getAttributes("blockquote").alert as CalloutKind | null) ?? null) : null,
  });

  useEffect(() => {
    if (!open || !mounted) return;
    const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    (items().find((el) => el.getAttribute("aria-checked") === "true") ?? items()[0])?.focus();
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === "ArrowDown" ? (index + 1) % list.length
        : event.key === "ArrowUp" ? (index - 1 + list.length) % list.length
        : event.key === "Home" ? 0
        : event.key === "End" ? list.length - 1
        : -1;
      if (next < 0) return;
      event.preventDefault();
      list[next]?.focus();
    }
    function onFocus(event: FocusEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("resize", close);
    };
  }, [open, mounted]);

  function toggle() {
    if (open) return setOpen(false);
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8)), top: r.bottom + 6 });
    setOpen(true);
  }

  function choose(kind: CalloutKind) {
    setOpen(false);
    toggleCallout(editor, kind);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("groupCallout")}
        title={t("groupCallout")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className(current != null)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
      >
        <MessageSquareWarning className="h-4 w-4" />
      </button>
      {mounted &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("groupCallout")}
            className={`fixed z-50 w-44 origin-top-left rounded-2xl border border-slate-200 bg-white p-1.5 shadow-float motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-850 ${
              closing ? "pointer-events-none animate-dropdown-out" : "animate-dropdown-in"
            }`}
            style={pos}
          >
            {CALLOUT_CHOICES.map(({ kind, icon: Icon, labelKey }) => (
              <button
                key={kind}
                type="button"
                role="menuitemradio"
                aria-checked={current === kind}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(kind)}
                className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" />
                <span className="flex-1">{t(labelKey)}</span>
                {current === kind && <Check aria-hidden className="h-4 w-4 shrink-0 text-accent-700 dark:text-accent-400" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
