import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostStatus } from "@/modules/blog/api/posts";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => "ko",
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/hooks/use-keyboard-inset", () => ({ useKeyboardInset: () => 0 }));
vi.mock("@/modules/blog/components/editor/series-select", () => ({ SeriesSelect: () => null }));
vi.mock("@/modules/blog/components/editor/tag-input", () => ({ TagInput: () => null }));

import { PublishDialog } from "./publish-dialog";

let root: Root;
let host: HTMLDivElement;
const onSave = vi.fn();
const onChangeStatus = vi.fn();
const onCancelSchedule = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  onSave.mockResolvedValue(true);
  onChangeStatus.mockResolvedValue(true);
  onCancelSchedule.mockResolvedValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function render(status: PostStatus, takenDown = false) {
  await act(async () =>
    root.render(
      <PublishDialog
        open
        onClose={vi.fn()}
        status={status}
        takenDown={takenDown}
        scheduledAt={status === "SCHEDULED" ? "2026-11-01T09:00:00Z" : null}
        title="밤의 글"
        cover={null}
        onCoverChange={vi.fn()}
        onUploadCover={vi.fn()}
        excerpt="요약"
        onExcerptChange={vi.fn()}
        slug="night"
        onSlugChange={vi.fn()}
        tags={["일상"]}
        onTagsChange={vi.fn()}
        seriesId={null}
        onSeriesChange={vi.fn()}
        bodyLinks={[]}
        error={null}
        saving={false}
        busy={false}
        onSave={onSave}
        onChangeStatus={onChangeStatus}
        onSchedule={vi.fn()}
        onCancelSchedule={onCancelSchedule}
      />,
    ),
  );
}

const button = (label: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);
const confirmDialog = () => document.querySelector('[role="dialog"][aria-labelledby]');

describe("publish dialog lifecycle confirms", () => {
  it("asks before unpublishing and does nothing when declined", async () => {
    await render("PUBLISHED");
    await act(async () => button("postEditor.unpublish")!.click());
    const ask = confirmDialog()!;
    expect(ask.textContent).toContain("postEditor.unpublishConfirmTitle");
    expect(ask.textContent).toContain("postEditor.unpublishConfirmDescription");
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => button("common.cancel", ask)!.click());
    expect(onChangeStatus).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves then unpublishes once confirmed", async () => {
    await render("PUBLISHED");
    await act(async () => button("postEditor.unpublish")!.click());
    await act(async () => button("postEditor.unpublish", confirmDialog()!)!.click());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onChangeStatus).toHaveBeenCalledWith("unpublish");
  });

  it("asks before cancelling a schedule", async () => {
    await render("SCHEDULED");
    await act(async () => button("postEditor.cancelSchedule")!.click());
    const ask = confirmDialog()!;
    expect(ask.textContent).toContain("postEditor.cancelScheduleConfirmTitle");
    expect(onCancelSchedule).not.toHaveBeenCalled();

    await act(async () => button("postEditor.cancelSchedule", ask)!.click());
    expect(onCancelSchedule).toHaveBeenCalledTimes(1);
  });
});

describe("a post taken down by an admin", () => {
  it.each([
    ["UNPUBLISHED", "postEditor.republish"],
    ["DRAFT", "postEditor.publish"],
  ] as const)("explains the %s post can be edited but not made public again", async (status, action) => {
    await render(status, true);
    const notice = document.querySelector('[data-testid="taken-down-notice"]')!;
    expect(notice.textContent).toContain("postEditor.takenDownTitle");
    expect(notice.textContent).toContain("postEditor.takenDownBody");
    const goPublic = button(action)!;
    expect(goPublic.disabled).toBe(true);
    expect(goPublic.getAttribute("aria-describedby")).toBe(notice.id);

    await act(async () => goPublic.click());
    expect(onChangeStatus).not.toHaveBeenCalled();
  });

  it("still saves edits", async () => {
    await render("UNPUBLISHED", true);
    await act(async () => button("postEditor.save")!.click());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows nothing of it on a post that was not taken down", async () => {
    await render("UNPUBLISHED");
    expect(document.querySelector('[data-testid="taken-down-notice"]')).toBeNull();
    expect(button("postEditor.republish")!.disabled).toBe(false);
  });
});
