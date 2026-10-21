import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rendered: vi.fn() }));
vi.mock("./note-quote-dialog", () => ({
  NoteQuoteDialog: (props: { quoted: unknown }) => {
    mocks.rendered(props.quoted);
    return createElement("div", { "data-testid": "quote-dialog" });
  },
}));
vi.mock("./note-drafts-sheet", () => ({ NoteDraftsSheet: () => null }));

import { LazyNoteQuoteDialog } from "./lazy-note-dialogs";

const quoted = { fresh: true as const, title: "새 노트" };
let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("requestIdleCallback", undefined);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const render = (value: typeof quoted | null) =>
  act(async () => {
    root.render(<LazyNoteQuoteDialog quoted={value} onClose={() => {}} onPosted={() => {}} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe("LazyNoteQuoteDialog", () => {
  it("renders nothing while it has never been opened", async () => {
    await render(null);
    expect(host.querySelector("[data-testid=quote-dialog]")).toBeNull();
    expect(mocks.rendered).not.toHaveBeenCalled();
  });

  it("mounts the real dialog on first open and keeps it mounted after close so its exit can play", async () => {
    await render(null);
    await render(quoted);
    await vi.waitFor(() => expect(host.querySelector("[data-testid=quote-dialog]")).not.toBeNull());
    expect(mocks.rendered).toHaveBeenLastCalledWith(quoted);

    await render(null);
    expect(host.querySelector("[data-testid=quote-dialog]")).not.toBeNull();
    expect(mocks.rendered).toHaveBeenLastCalledWith(null);
  });
});
