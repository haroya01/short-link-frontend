/**
 * A module-level "the post editor has unsaved edits" flag, published by {@link usePostEditor} and read
 * by the surrounding chrome (header logo / Write CTA, mobile sidebar). The editor's `dirty` state and
 * its `beforeunload` guard live inside the editor's own subtree, but the chrome that soft-navigates
 * away from it (a Next `<Link>` / transition router push) sits ABOVE the editor in the tree and never
 * triggers `beforeunload`. This shared flag lets that chrome notice the pending edits and fall back to
 * a hard navigation (which does fire the editor's `beforeunload` "leave site?" prompt) instead of
 * silently soft-navigating the unsaved work away.
 *
 * Pure module state (no React) so a single writer and many readers coordinate without a provider
 * wrapping both subtrees. {@link useEditorDirty} is the thin `useSyncExternalStore` adapter; the
 * synchronous {@link isEditorDirty} lets a click handler decide before it lets the navigation proceed.
 */
import { useSyncExternalStore } from "react";

let dirty = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Publish whether the editor currently has unsaved edits. Idempotent — no emit when unchanged. */
export function setEditorDirty(next: boolean): void {
  if (dirty === next) return;
  dirty = next;
  emit();
}

/** Synchronous read for click handlers that must decide soft- vs hard-navigation on the spot. */
export function isEditorDirty(): boolean {
  return dirty;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return dirty;
}

// The editor is client-only, and the flag is always false on the server (no editor mounted there), so
// the server snapshot matches the pre-hydration client snapshot — no mismatch.
function getServerSnapshot(): boolean {
  return false;
}

/** Subscribe the chrome to the editor's dirty flag so it re-renders when unsaved edits appear/clear. */
export function useEditorDirty(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
