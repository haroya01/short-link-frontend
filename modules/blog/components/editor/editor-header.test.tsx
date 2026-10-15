import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostStatus } from "@/modules/blog/api/posts";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock("@/modules/blog/components/editor/revisions-button", () => ({ RevisionsButton: () => null }));
vi.mock("@/modules/blog/components/post-status-badge", () => ({
  PostStatusBadge: ({ status }: { status: string }) => createElement("span", { "data-badge": status }),
}));

import { EditorHeader } from "./editor-header";

let root: Root;
let host: HTMLDivElement;
const onSave = vi.fn();
const onRetrySave = vi.fn();

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

async function render(status: PostStatus, saveFailed: boolean) {
  await act(async () =>
    root.render(
      <EditorHeader
        backHref="/write"
        postId={16}
        status={status}
        saving={false}
        saved={false}
        saveFailed={saveFailed}
        lastSavedAt={new Date("2026-10-11T05:32:00Z")}
        busy={false}
        preview={<button type="button" data-preview />}
        onSave={onSave}
        onRetrySave={onRetrySave}
        onBack={vi.fn()}
        onOpenPublish={vi.fn()}
        onRestoreRevision={vi.fn()}
        onExport={vi.fn()}
        onDelete={vi.fn()}
      />,
    ),
  );
}

const retry = () => host.querySelector<HTMLButtonElement>("[data-save-failed]");

describe("the editor header's save status", () => {
  it("turns a draft's quiet status into a retry the moment a save fails", async () => {
    await render("DRAFT", false);
    expect(retry()).toBeNull();
    expect(host.textContent).toContain("postEditor.savedAt");

    await render("DRAFT", true);
    expect(retry()!.textContent).toBe("postEditor.saveFailedRetry");
    expect(host.textContent).not.toContain("postEditor.savedAt");
    await act(async () => retry()!.click());
    expect(onRetrySave).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps a live post's badge and swaps only its 저장 for the retry", async () => {
    await render("PUBLISHED", true);
    expect(host.querySelector("[data-badge=PUBLISHED]")).not.toBeNull();
    expect(retry()).not.toBeNull();
    expect([...host.querySelectorAll("button")].some((b) => b.textContent === "postEditor.save")).toBe(false);
  });

  it("carries the preview button it is given", async () => {
    await render("DRAFT", false);
    expect(host.querySelector("[data-preview]")).not.toBeNull();
  });
});
