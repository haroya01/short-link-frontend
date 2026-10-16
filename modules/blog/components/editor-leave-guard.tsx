"use client";

import { useEditorDirty } from "@/modules/blog/lib/editor-dirty-store";

// Chrome links (the mobile drawer, the notification panel) are next-intl <Link>s that soft-navigate,
// which never trips the post editor's beforeunload guard — so a tap mid-edit would drop the unsaved
// work silently. When the editor has unsaved edits, intercept a plain left-click on any in-app link
// inside and force a hard navigation instead, which does fire the "leave site?" prompt. Inert whenever
// the editor is clean (useEditorDirty() is false), so ordinary navigation keeps its soft-nav behaviour.
// Modified/middle clicks fall through to the native anchor (new tab), same as elsewhere in the chrome.
export function EditorLeaveGuard({ children }: { children: React.ReactNode }) {
  const dirty = useEditorDirty();
  return (
    <div
      className="contents"
      onClickCapture={(e) => {
        if (!dirty) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
        if (!anchor || anchor.target === "_blank") return;
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(anchor.href);
      }}
    >
      {children}
    </div>
  );
}
