"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import type { NoteDraftsSheet as NoteDraftsSheetType } from "./note-drafts-sheet";
import type { NoteQuoteDialog as NoteQuoteDialogType } from "./note-quote-dialog";

const loadQuote = () => import("./note-quote-dialog").then((m) => m.NoteQuoteDialog);
const loadDrafts = () => import("./note-drafts-sheet").then((m) => m.NoteDraftsSheet);

const NoteQuoteDialog = dynamic(loadQuote, { ssr: false });
const NoteDraftsSheet = dynamic(loadDrafts, { ssr: false });

let preloaded = false;

function usePreloadWhenIdle() {
  useEffect(() => {
    if (preloaded) return;
    const load = () => {
      preloaded = true;
      void Promise.all([loadQuote(), loadDrafts()]).catch(() => undefined);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(load, 2000);
    return () => window.clearTimeout(id);
  }, []);
}

function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

export function LazyNoteQuoteDialog(props: ComponentProps<typeof NoteQuoteDialogType>) {
  usePreloadWhenIdle();
  return useOpenedOnce(props.quoted !== null) ? <NoteQuoteDialog {...props} /> : null;
}

export function LazyNoteDraftsSheet(props: ComponentProps<typeof NoteDraftsSheetType>) {
  usePreloadWhenIdle();
  return useOpenedOnce(props.open) ? <NoteDraftsSheet {...props} /> : null;
}
