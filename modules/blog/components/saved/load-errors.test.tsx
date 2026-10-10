import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listSavedFeed: vi.fn(), listFolders: vi.fn(), listMyHighlights: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => () => "error" }));
vi.mock("@/modules/blog/api/saved", () => ({
  listSavedFeed: mocks.listSavedFeed,
  listFolders: mocks.listFolders,
  createFolder: vi.fn(),
  moveSavedToFolder: vi.fn(),
  removeSaved: vi.fn(),
}));
vi.mock("@/modules/blog/api/highlights", () => ({ listMyHighlights: mocks.listMyHighlights }));
vi.mock("next-view-transitions", () => ({ Link: (props: { children: React.ReactNode }) => <a>{props.children}</a> }));

import { SmartShelf } from "./smart-shelf";
import { HighlightsList } from "./highlights-list";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
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

const retry = () =>
  Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "savedLibrary.retry")!;

describe("library load failures", () => {
  it("bookmarks: a failed load says so with a retry instead of 'nothing saved yet'", async () => {
    mocks.listSavedFeed.mockRejectedValueOnce(new Error("500"));
    mocks.listFolders.mockResolvedValue([]);
    await act(async () => root.render(<SmartShelf username="dohyun" locale="ko" />));
    expect(host.textContent).toContain("savedLibrary.bookmarksLoadError");
    expect(host.textContent).not.toContain("savedLibrary.emptyBookmarks");

    mocks.listSavedFeed.mockResolvedValueOnce([]);
    await act(async () => retry().click());
    expect(mocks.listSavedFeed).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain("savedLibrary.emptyBookmarks");
  });

  it("highlights: a failed load names highlights, not the reading history", async () => {
    mocks.listMyHighlights.mockRejectedValueOnce(new Error("500"));
    await act(async () => root.render(<HighlightsList username="dohyun" locale="ko" />));
    expect(host.textContent).toContain("savedLibrary.highlightsLoadError");
    expect(host.textContent).not.toContain("savedLibrary.loadError");
    expect(retry()).toBeDefined();
  });
});
