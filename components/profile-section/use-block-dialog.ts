"use client";

import { useCallback, useState } from "react";

/**
 * Tiny state hook for a block-editor dialog. Each ProfileSection used to declare 10 of these by
 * hand:
 *
 * <pre>
 * const [contactCardDialog, setContactCardDialog] = useState&lt;{
 *   open: boolean;
 *   blockId: number | null;
 *   initialJson: string | null;
 * }&gt;({ open: false, blockId: null, initialJson: null });
 * </pre>
 *
 * <p>That's ~60 lines of identical boilerplate plus three different "initial" prop names
 * ({@code initialJson} / {@code initialUrl} / {@code initialContent}) so renaming any of them
 * cost three touch points per dialog. This hook collapses each declaration to one line and
 * gives every dialog the same {@code show / close} surface.
 *
 * <p>The payload type is generic — most dialogs store the existing block's JSON content as a
 * string (for "edit" mode), but image / embed dialogs store the URL string and the text dialog
 * stores the markdown source. {@code null} for "create" mode.
 */
export type BlockDialogState<T> = {
  open: boolean;
  /** {@code null} = creating a new block. Number = editing an existing block by id. */
  blockId: number | null;
  /** Initial payload to seed the form — {@code null} when creating. */
  initialPayload: T | null;
  /** Open the dialog. Pass {@code (null, null)} for create-mode. */
  show: (blockId: number | null, initialPayload: T | null) => void;
  /** Close without saving. The parent dialog component handles its own onOpenChange via this. */
  close: () => void;
};

export function useBlockDialog<T>(): BlockDialogState<T> {
  const [state, setState] = useState<{
    open: boolean;
    blockId: number | null;
    initialPayload: T | null;
  }>({ open: false, blockId: null, initialPayload: null });

  const show = useCallback((blockId: number | null, initialPayload: T | null) => {
    setState({ open: true, blockId, initialPayload });
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return { ...state, show, close };
}
