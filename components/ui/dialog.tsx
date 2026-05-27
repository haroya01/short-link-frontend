"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  /**
   * Override the panel's max width. Defaults to <code>max-w-md</code> (28rem / 448px) which fits
   * single-input dialogs (embed URL, image upload, etc.). Override to <code>max-w-2xl</code> when
   * the body needs a textarea + preview pane side-by-side, or wider when the dialog renders a
   * multi-column form.
   */
  maxWidthClass?: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmDisabled,
  cancelLabel,
  destructive,
  onConfirm,
  children,
  maxWidthClass = "max-w-md",
}: DialogProps) {
  const t = useTranslations("common");
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  React.useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => {
      const target = firstFocusable(dialogRef.current) ?? dialogRef.current;
      target?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) {
        onOpenChange(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = focusableElements(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    // Top-anchored, scrollable backdrop — previously {@code grid place-items-center} which
    // vertically centered the panel. Centering meant the Save button visibly "jumped up" when
    // the user toggled into a dialog with fewer fields (contact card, etc.) because the panel
    // shrunk and re-centered around the smaller content. Anchoring to top + a fixed top
    // offset keeps the Save button position predictable regardless of body length.
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 pt-12 sm:pt-16">
      <div
        className="fixed inset-0 bg-slate-900/50"
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
          "relative mx-auto flex max-h-[calc(100vh-4rem)] min-h-[min(540px,calc(100vh-4rem))] w-full flex-col rounded-lg border border-slate-200 bg-white shadow-xl",
          maxWidthClass,
          "animate-fade-in",
        )}
      >
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>
        {/* Sticky footer — actions always at the bottom of the panel regardless of body
            scroll position. Border separates it visually from the body so the user knows
            it's a fixed control rather than another field. */}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy || confirmDisabled}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("processing") : confirmLabel ?? t("confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function focusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

function firstFocusable(root: HTMLElement | null): HTMLElement | null {
  return focusableElements(root)[0] ?? null;
}
