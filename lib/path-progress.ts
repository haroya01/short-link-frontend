/**
 * Path reading progress — the device-local layer that turns a PATH collection from a list into a
 * reading destination. All state is per-device (localStorage), no account and no backend: the ordered
 * `connections[]` and each curator `why` already arrive from the server; this only tracks "which steps
 * has this device already opened" so the walk can highlight where you are and offer "continue".
 *
 * Mirrors the {@link file://../modules/blog/components/reading-resume.tsx ReadingResume} pattern
 * (per-post scroll position keyed by post) but at the path scope: a set of opened connection ids keyed
 * by collection. Kept as pure functions so the derivations (current step, next readable step, estimated
 * minutes) are unit-tested and free of React / storage side effects.
 */
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";

/** Minimal block shape the derivations need — a subset of `Connection` (kept structural so the helper
 *  doesn't depend on the API module and the tests can pass plain literals). */
export interface PathStep {
  id: number;
  blockType: "POST" | "HIGHLIGHT" | "NOTE";
  slug: string | null;
  username: string | null;
}

const READ_KEY_PREFIX = "kurl:path-read:";

/** Coarse per-post estimate (minutes). The connection payload carries no word counts, so the path
 *  duration is an honest approximation ("약") from the number of readable steps, not a precise sum. */
const MINUTES_PER_STEP = 4;

function readKey(collectionId: number): string {
  return `${READ_KEY_PREFIX}${collectionId}`;
}

const isNumberArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((x) => typeof x === "number");

/** The set of connection ids this device has already opened from the given path. */
export function readOpenedSteps(collectionId: number): Set<number> {
  return new Set(readStorageJson(readKey(collectionId), isNumberArray, []));
}

/** Mark a step opened (idempotent). Called when the reader navigates into a step's block. */
export function markStepOpened(collectionId: number, connectionId: number): void {
  const opened = readOpenedSteps(collectionId);
  if (opened.has(connectionId)) return;
  opened.add(connectionId);
  writeStorageJson(readKey(collectionId), [...opened]);
}

/** A step is a *readable* destination when its block deep-links somewhere: a POST (→ the post) or a
 *  HIGHLIGHT (→ the source post at that sentence). A NOTE lives where it is and has no destination. */
export function isReadableStep(step: PathStep): boolean {
  return (
    (step.blockType === "POST" || step.blockType === "HIGHLIGHT") && !!step.slug && !!step.username
  );
}

/**
 * The current position in the walk = the first step this device hasn't opened yet (the next thing to
 * read). If every step has been opened, the walk is complete → returns `steps.length` (a sentinel past
 * the end). An empty path returns 0.
 */
export function currentStepIndex(steps: PathStep[], opened: Set<number>): number {
  const idx = steps.findIndex((s) => !opened.has(s.id));
  return idx === -1 ? steps.length : idx;
}

/**
 * The next readable step to continue into, at or after `fromIndex`. Skips NOTEs (no destination). Used
 * by the continuity bar's "continue" affordance. Returns null when nothing readable remains. Generic
 * over the step type so callers get their original element back (e.g. a full `Connection`).
 */
export function nextReadableStep<T extends PathStep>(
  steps: T[],
  fromIndex: number,
): { step: T; index: number } | null {
  for (let i = Math.max(0, fromIndex); i < steps.length; i++) {
    if (isReadableStep(steps[i])) return { step: steps[i], index: i };
  }
  return null;
}

/** Coarse "약 N분" estimate for the whole path — MINUTES_PER_STEP per readable step, min 1. */
export function estimatePathMinutes(steps: PathStep[]): number {
  const readable = steps.filter(isReadableStep).length;
  return Math.max(1, readable * MINUTES_PER_STEP);
}
