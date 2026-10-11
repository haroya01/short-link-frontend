import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setEditorDirty } from "@/modules/blog/lib/editor-dirty-store";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next-intl", () => ({ useLocale: () => "ko", useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/host", () => ({ blogHref: (path: string) => `/ko/blog${path}` }));
vi.mock("@/modules/blog/lib/use-live-search", () => ({
  useLiveSearch: () => ({ results: [], loading: false, failed: false, retry: vi.fn() }),
}));
vi.mock("@/modules/blog/lib/use-live-people", () => ({ useLivePeople: () => [] }));
vi.mock("@/modules/blog/components/live-people", () => ({ LivePeople: () => null }));

import { BlogHeaderSearch } from "./blog-header-search";

let root: Root;
let host: HTMLDivElement;
const assign = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("location", { ...window.location, assign, origin: "http://localhost:3000", search: "" });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<BlogHeaderSearch />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="searchLabel"]')!.click());
});
afterEach(async () => {
  setEditorDirty(false);
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function search(q: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, q);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("searching from the header", () => {
  it("loads the results page in full while the editor holds unsaved work, so its leave prompt runs", async () => {
    await act(async () => setEditorDirty(true));
    await search("tiptap");
    expect(assign).toHaveBeenCalledWith("http://localhost:3000/ko/blog/?q=tiptap");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("soft-navigates to the results otherwise", async () => {
    await search("tiptap");
    expect(router.push).toHaveBeenCalledWith("/ko/blog/?q=tiptap");
    expect(assign).not.toHaveBeenCalled();
  });
});
