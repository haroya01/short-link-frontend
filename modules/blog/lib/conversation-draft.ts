import { readStorageJson, removeStorageItem, writeStorageJson } from "@/lib/storage-json";

export type DraftSurface = "comment" | "comment-reply" | "comment-target" | "highlight-reply" | "note-reply";

export type ConversationDraft = { text: string; target?: number; at: number };

const INTENT_TTL_MS = 10 * 60 * 1000;

const keyOf = (surface: DraftSurface, id: number) => `kurl:draft:${surface}:${id}`;

const isDraft = (v: unknown): v is ConversationDraft | null =>
  v === null ||
  (typeof v === "object" &&
    v !== null &&
    typeof (v as ConversationDraft).text === "string" &&
    typeof (v as ConversationDraft).at === "number");

export function readDraft(surface: DraftSurface, id: number, now = Date.now()): ConversationDraft | null {
  const draft = readStorageJson(keyOf(surface, id), isDraft, null, { session: true });
  if (!draft) return null;
  if (!draft.text.trim() && now - draft.at > INTENT_TTL_MS) {
    clearDraft(surface, id);
    return null;
  }
  return draft;
}

export function writeDraft(surface: DraftSurface, id: number, text: string, target?: number) {
  writeStorageJson(keyOf(surface, id), { text, target, at: Date.now() } satisfies ConversationDraft, { session: true });
}

export function clearDraft(surface: DraftSurface, id: number) {
  removeStorageItem(keyOf(surface, id), { session: true });
}
