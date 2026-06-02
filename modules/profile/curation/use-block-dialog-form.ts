"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * The "(re)parse the stored payload into editable form state whenever the dialog opens" effect that
 * every block dialog carried verbatim: a single draft state seeded from {@code parse(initial)}, reset
 * to a freshly parsed copy each time the dialog (re)opens or its initial payload changes. Returns the
 * standard `[draft, setDraft]` tuple so existing field handlers — `setDraft((d) => ({ ...d, x }))` —
 * keep working unchanged; only the boilerplate `useState` + open-effect collapses to one call.
 *
 * {@code parse} owns the dialog-specific shape (JSON → fields, or a raw string for the URL-only
 * dialogs) and is expected to return its own empty/default value for a null or malformed payload.
 *
 * @template T the editable draft shape
 */
export function useBlockDialogForm<T>(
  open: boolean,
  initial: string | null,
  parse: (raw: string | null) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [draft, setDraft] = useState<T>(() => parse(initial));
  useEffect(() => {
    if (!open) return;
    setDraft(parse(initial));
    // parse is re-created each render; like the standalone effect it replaces, we re-parse only when
    // the dialog (re)opens or the stored payload changes — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);
  return [draft, setDraft];
}
