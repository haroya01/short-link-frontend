import React, { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightNoteSheet } from "./highlight-note-sheet";

const mocks = vi.hoisted(() => ({ save: vi.fn(), cancel: vi.fn(), input: null as any }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/dynamic", () => ({
  default: () => (props: any) => {
    mocks.input = props;
    return createElement("textarea", { value: props.value, readOnly: true, "aria-label": "note" });
  },
}));

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.save.mockResolvedValue(true);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function mount() {
  function Harness() {
    const [open, setOpen] = useState(true);
    return open ? createElement(HighlightNoteSheet, {
      quote: "The exact selected passage",
      onCancel: mocks.cancel,
      onSave: async (note: string) => {
        const saved = await mocks.save(note);
        if (saved) setOpen(false);
        return saved;
      },
    }) : null;
  }
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(Harness)); });
}
function button(label: string) {
  return Array.from(host.querySelectorAll("button")).find((b) => b.textContent === label)!;
}
async function writeNote(text: string) {
  await act(async () => mocks.input.onChange(text));
}

describe("highlight memo saving", () => {
  it("keeps the draft and quote through a failed request, then closes only after a successful retry", async () => {
    let finish!: (saved: boolean) => void;
    mocks.save.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
    await mount();
    await writeNote("A note I do not want to lose");
    await act(async () => { button("highlightNoteSave").click(); });
    expect(host.querySelector('[role="dialog"]')?.getAttribute("aria-busy")).toBe("true");
    expect(button("highlightSaving").disabled).toBe(true);
    await act(async () => {
      mocks.input.onSubmitShortcut();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.cancel).not.toHaveBeenCalled();
    await act(async () => finish(false));
    expect(host.querySelector("textarea")?.value).toBe("A note I do not want to lose");
    expect(host.querySelector("blockquote")?.textContent).toBe("The exact selected passage");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("highlightSaveError");
    await act(async () => { button("highlightNoteSave").click(); });
    expect(mocks.save).toHaveBeenLastCalledWith("A note I do not want to lose");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it("retains input on a rejected request and states the public scope before saving", async () => {
    mocks.save.mockRejectedValueOnce(new Error("offline"));
    await mount();
    expect(host.querySelector("#note-sheet-scope")?.textContent).toBe("highlightPublicScope");
    await writeNote("Keep this offline draft");
    await act(async () => { button("highlightNoteSave").click(); });
    expect(host.querySelector("textarea")?.value).toBe("Keep this offline draft");
    expect(button("highlightNoteSave").disabled).toBe(false);
  });

  it("requires an explicit discard after cancelling a nonempty draft", async () => {
    await mount();
    await writeNote("unfinished");
    await act(async () => { button("highlightNoteCancel").click(); });
    expect(mocks.cancel).not.toHaveBeenCalled();
    await act(async () => { button("highlightKeepEditing").click(); });
    expect(host.querySelector("textarea")?.value).toBe("unfinished");
    await act(async () => { button("highlightNoteCancel").click(); });
    await act(async () => { button("highlightDiscard").click(); });
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
  });

  it("blocks serialized notes over the backend limit, including the submit shortcut", async () => {
    await mount();
    await writeNote("a".repeat(501));
    expect(button("highlightNoteSave").disabled).toBe(true);
    await act(async () => mocks.input.onSubmitShortcut());
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
