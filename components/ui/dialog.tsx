"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { createPortal } from "react-dom";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  destructive?: boolean;
  /** Override the confirm button variant (e.g. "accent" for a primary save). Defaults to default,
   *  or destructive when {@code destructive}. */
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  /**
   * Override the panel's max width. Defaults to <code>max-w-md</code> (28rem / 448px) which fits
   * single-input dialogs (embed URL, image upload, etc.). Override to <code>max-w-2xl</code> when
   * the body needs a textarea + preview pane side-by-side, or wider when the dialog renders a
   * multi-column form.
   */
  maxWidthClass?: string;
  /** Size to content instead of pinning a min height — for lightweight confirms (no form body). */
  compact?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmDisabled,
  cancelLabel,
  destructive,
  confirmVariant,
  onConfirm,
  children,
  maxWidthClass = "max-w-md",
  compact = false,
}: DialogProps) {
  const t = useTranslations("common");
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  // Portal target (<body>) only exists on the client; gate so SSR/first paint render nothing —
  // matches the closed state and avoids a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // Exit phase: hold the dialog mounted while panel + backdrop fade back out (mirrors the enter).
  const { mounted: present, closing } = usePresence(open, 160);

  React.useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useFocusTrap(dialogRef, {
    active: open,
    onEscape: () => {
      if (!busyRef.current) onOpenChange(false);
    },
  });

  // The backdrop owns scrolling (overflow-y-auto below); without locking <body> the wheel chains
  // through and scrolls the page behind the dialog once the panel fits the viewport.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!present || !mounted) return null;

  // Portal to <body>: a transformed/animated ancestor (the post page's `.post-enter` article, a
  // will-change page wrapper, etc.) would otherwise make this `fixed inset-0` overlay resolve against
  // that ancestor's box instead of the viewport — clipping the backdrop to a column.
  return createPortal(
    // Top-anchored, scrollable backdrop — previously {@code grid place-items-center} which
    // vertically centered the panel. Centering meant the Save button visibly "jumped up" when
    // the user toggled into a dialog with fewer fields (contact card, etc.) because the panel
    // shrunk and re-centered around the smaller content. Anchoring to top + a fixed top
    // offset keeps the Save button position predictable regardless of body length.
    <div
      // 닫히는 동안 전면 컨테이너가 클릭을 삼키지도, 접근성 트리에 남지도 않게(전면 오버레이 공통 규칙).
      aria-hidden={closing || undefined}
      className={cn(
        "fixed inset-0 z-50 overflow-y-auto px-4 pt-12 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-16",
        closing && "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70",
          // The backdrop fades with the panel — it used to snap in/out around the panel's fade.
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
        onClick={() => !busy && onOpenChange(false)}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        // min-h pins the panel at a consistent height regardless of body content. Without it,
        // a 3-field dialog (e.g. contact card with only email filled) would shrink the panel
        // to ~200px tall and pull the Save button up toward the screen middle; a 7-field
        // dialog would push Save back down. The vertical position jumping disorients users
        // navigating between dialogs. Floor at min(540px, viewport-4rem) so phones with very
        // short viewports don't get squeezed below their natural content height.
        className={cn(
          // dvh (not vh): on iOS Safari 100vh is the toolbar-expanded height, so with the toolbar
          // visible a vh-sized panel pushes its sticky footer (cancel/confirm) below the visible area,
          // forcing a scroll to reach it. dvh tracks the actual viewport.
          "glass-panel relative mx-auto flex max-h-[calc(100dvh-4rem)] w-full flex-col rounded-lg border border-slate-200/70 dark:border-slate-700/70",
          // Compact confirms size to content; form dialogs pin a min height so Save doesn't jump.
          !compact && "min-h-[min(540px,calc(100dvh-4rem))]",
          maxWidthClass,
          closing ? "animate-fade-out" : "animate-fade-in",
        )}
      >
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>
        {/* Sticky footer — actions always at the bottom of the panel regardless of body
            scroll position. Border separates it visually from the body so the user knows
            it's a fixed control rather than another field. */}
        <div className="flex justify-end gap-2 border-t border-slate-100/80 px-6 py-4 dark:border-slate-800/80">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={confirmVariant ?? (destructive ? "destructive" : "default")}
            disabled={busy || confirmDisabled}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch {
                // onConfirm rejected (e.g. inline validation / save failure) — keep the dialog open
                // so the caller's error stays visible instead of discarding the unsaved form.
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("processing") : confirmLabel ?? (destructive ? t("delete") : t("confirm"))}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
