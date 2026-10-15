import { useCallback, useSyncExternalStore } from "react";
import { readStorageString, removeStorageItem, writeStorageJson } from "@/lib/storage-json";
import type { NotePollDraft, NoteReplyPolicy, NoteVisibility, QuotedNote, QuotedPost } from "@/modules/notes/api/notes";

export const NOTE_DRAFT_LIMIT = 20;

export type NoteDraftQuote = { post: QuotedPost } | { note: QuotedNote };

export interface NoteDraft {
  id: string;
  updatedAt: number;
  body: string;
  parts: string[];
  /** The content warning text, or null while the warning is off. */
  warning: string | null;
  visibility: NoteVisibility;
  replyPolicy: NoteReplyPolicy;
  language: string;
  poll: NotePollDraft | null;
  /** `datetime-local` value, "" when not scheduled. */
  scheduledAt: string;
  quote: NoteDraftQuote | null;
  /** Pictures are not kept; the count lets a restore say how many to add again. */
  imageCount: number;
}

const CHANGED = "kurl:note-drafts";
const keyOf = (userId: number) => `kurl:note-drafts:${userId}`;

const isDraft = (v: unknown): v is NoteDraft => {
  const d = v as NoteDraft;
  return (
    typeof d === "object" &&
    d !== null &&
    typeof d.id === "string" &&
    typeof d.updatedAt === "number" &&
    typeof d.body === "string" &&
    Array.isArray(d.parts) &&
    d.parts.every((p) => typeof p === "string")
  );
};

function parse(raw: string | null): NoteDraft[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isDraft).sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function hasDraftContent(d: Pick<NoteDraft, "body" | "parts" | "warning" | "poll">): boolean {
  return (
    d.body.trim() !== "" ||
    d.parts.some((p) => p.trim() !== "") ||
    (d.warning?.trim() ?? "") !== "" ||
    (d.poll?.options.some((o) => o.trim() !== "") ?? false)
  );
}

export function readNoteDrafts(userId: number): NoteDraft[] {
  return parse(readStorageString(keyOf(userId)));
}

function write(userId: number, drafts: NoteDraft[]) {
  if (drafts.length === 0) removeStorageItem(keyOf(userId));
  else writeStorageJson(keyOf(userId), drafts);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

/** Saves (or replaces) a draft; one without content is removed instead. Keeps the newest {@link NOTE_DRAFT_LIMIT}. */
export function saveNoteDraft(userId: number, draft: NoteDraft) {
  const rest = readNoteDrafts(userId).filter((d) => d.id !== draft.id);
  write(userId, hasDraftContent(draft) ? [draft, ...rest].slice(0, NOTE_DRAFT_LIMIT) : rest);
}

export function deleteNoteDraft(userId: number, id: string) {
  write(
    userId,
    readNoteDrafts(userId).filter((d) => d.id !== id),
  );
}

export function newNoteDraftId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** A restored schedule is only kept while it is still in the future. */
export function restoredSchedule(scheduledAt: string, now = Date.now()): string {
  if (!scheduledAt) return "";
  const at = new Date(scheduledAt).getTime();
  return Number.isFinite(at) && at > now ? scheduledAt : "";
}

/** The first line a draft would be recognised by in a list. */
export function noteDraftLabel(d: NoteDraft): string {
  const text = [d.body, ...d.parts, d.warning ?? ""].find((s) => s.trim() !== "");
  const line = text ?? d.poll?.options.find((o) => o.trim() !== "") ?? "";
  return line.trim().split("\n")[0];
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const parsed = new Map<string, { raw: string | null; drafts: NoteDraft[] }>();
const EMPTY: NoteDraft[] = [];

/** The signed-in account's device drafts, newest first; empty when signed out. */
export function useNoteDrafts(userId: number | null | undefined): NoteDraft[] {
  const snapshot = useCallback(() => {
    if (userId == null) return EMPTY;
    const key = keyOf(userId);
    const raw = readStorageString(key);
    const cached = parsed.get(key);
    if (cached && cached.raw === raw) return cached.drafts;
    const drafts = parse(raw);
    parsed.set(key, { raw, drafts });
    return drafts;
  }, [userId]);
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
