"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

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

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "확인",
  confirmDisabled,
  cancelLabel = "취소",
  destructive,
  onConfirm,
  children,
  maxWidthClass = "max-w-md",
}: DialogProps) {
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={() => !busy && onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full rounded-lg border border-slate-200 bg-white p-6 shadow-xl",
          maxWidthClass,
          "animate-fade-in",
        )}
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
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
            {busy ? "처리 중..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
