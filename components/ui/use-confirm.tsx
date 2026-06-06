"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Promise-based in-app confirm — a locale-aware, on-brand drop-in for `window.confirm`. Renders the
 * shared ConfirmDialog (role="dialog", focus trap, ESC, destructive styling) instead of the OS chrome
 * that ignores the app's design + locale (and reads as the loudest possible modal on a quiet surface).
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title: t("deleteConfirm"), destructive: true }))) return;
 *   // ... caller does the async work + owns its own busy state ...
 *   return (<>{rest}{confirmDialog}</>);
 *
 * The dialog closes the instant the choice is made (decide → then act), the same shape as
 * window.confirm — so the caller's existing post-confirm logic is unchanged.
 */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOpts(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(next);
      }),
    [],
  );

  const dialog = opts ? (
    <ConfirmDialog
      open
      compact
      destructive={opts.destructive}
      title={opts.title}
      description={opts.description}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return [confirm, dialog];
}
