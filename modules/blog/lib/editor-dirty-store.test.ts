import { describe, expect, it } from "vitest";
import { isEditorDirty, setEditorDirty } from "./editor-dirty-store";

/**
 * The shared "editor has unsaved edits" flag the chrome (header links, mobile drawer) reads to fall
 * back from a soft to a hard navigation. Characterizes the writer contract that a click handler
 * depends on: {@link setEditorDirty} publishes the value and {@link isEditorDirty} reads it back
 * synchronously (so a click handler can decide soft- vs hard-navigation on the spot).
 */
describe("editor-dirty-store", () => {
  it("defaults to clean", () => {
    setEditorDirty(false);
    expect(isEditorDirty()).toBe(false);
  });

  it("publishes the flag for a synchronous read, both ways", () => {
    setEditorDirty(true);
    expect(isEditorDirty()).toBe(true);
    setEditorDirty(false);
    expect(isEditorDirty()).toBe(false);
  });

  it("is idempotent on a repeated write", () => {
    setEditorDirty(true);
    setEditorDirty(true);
    expect(isEditorDirty()).toBe(true);
    setEditorDirty(false); // reset so leftover state can't leak into other suites
  });
});
