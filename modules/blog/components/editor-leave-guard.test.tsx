import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setEditorDirty } from "@/modules/blog/lib/editor-dirty-store";
import { EditorLeaveGuard } from "./editor-leave-guard";

let root: Root;
let host: HTMLDivElement;
const assign = vi.fn();
const softNavigate = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("location", { ...window.location, assign });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <EditorLeaveGuard>
        <a href="http://localhost:3000/ko/blog/notifications" onClick={(e) => { e.preventDefault(); softNavigate(); }}>
          all
        </a>
      </EditorLeaveGuard>,
    ),
  );
});
afterEach(async () => {
  setEditorDirty(false);
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const click = (init: MouseEventInit = {}) =>
  act(async () => {
    host.querySelector("a")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));
  });

describe("a chrome link while the editor holds unsaved work", () => {
  it("leaves by a full page load, so the editor's leave-site prompt gets its say", async () => {
    await act(async () => setEditorDirty(true));
    await click();
    expect(assign).toHaveBeenCalledWith("http://localhost:3000/ko/blog/notifications");
    expect(softNavigate).not.toHaveBeenCalled();
  });

  it("keeps the soft navigation when there is nothing to lose, and leaves a new-tab click alone", async () => {
    await click();
    expect(softNavigate).toHaveBeenCalledOnce();
    await act(async () => setEditorDirty(true));
    await click({ metaKey: true });
    expect(assign).not.toHaveBeenCalled();
  });
});
