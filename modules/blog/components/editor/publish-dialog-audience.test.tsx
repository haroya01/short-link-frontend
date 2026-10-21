import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostStatus } from "@/modules/blog/api/posts";
import type { PublishAccess } from "./publish-dialog";

const seen = vi.hoisted(() => ({ section: null as null | Record<string, unknown> }));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => "ko",
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/hooks/use-keyboard-inset", () => ({ useKeyboardInset: () => 0 }));
vi.mock("@/modules/blog/components/editor/series-select", () => ({ SeriesSelect: () => null }));
vi.mock("@/components/common/tag-input", () => ({ TagInput: () => null }));
vi.mock("@/modules/blog/components/editor/audience-section", async () => {
  const { createElement } = await import("react");
  return {
    AudienceSection: (props: Record<string, unknown>) => {
      seen.section = props;
      return createElement("div", { "data-testid": "audience-section" });
    },
  };
});

import { PublishDialog } from "./publish-dialog";

let root: Root;
let host: HTMLDivElement;
const onSave = vi.fn();
const onClose = vi.fn();
const onChangeStatus = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  seen.section = null;
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  Element.prototype.scrollIntoView = vi.fn();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  onSave.mockResolvedValue(true);
  onChangeStatus.mockResolvedValue(true);
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

function access(over: Partial<PublishAccess>): PublishAccess {
  return {
    audience: "PUBLIC",
    onAudienceChange: vi.fn(),
    password: "",
    onPasswordChange: vi.fn(),
    hasPassword: false,
    savedAudience: "PUBLIC",
    unlistedUrl: null,
    onRotate: vi.fn(),
    blockedCountries: [],
    onBlockedCountriesChange: vi.fn(),
    ...over,
  };
}

async function render(status: PostStatus, over: Partial<PublishAccess>) {
  await act(async () =>
    root.render(
      <PublishDialog
        open
        onClose={onClose}
        status={status}
        scheduledAt={null}
        access={access(over)}
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
        error={null}
        saving={false}
        busy={false}
        onSave={onSave}
        onChangeStatus={onChangeStatus}
        onSchedule={vi.fn()}
        onCancelSchedule={vi.fn()}
      />,
    ),
  );
}

const button = (label: string) =>
  Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

describe("publishing a post with an audience", () => {
  it("sits right under the tags, before 발행 시점", async () => {
    await render("DRAFT", {});
    const tags = Array.from(document.querySelectorAll("label")).find((l) => l.textContent?.startsWith("postEditor.tags"))!;
    const section = document.querySelector('[data-testid="audience-section"]')!;
    const timing = document.querySelector('[role="radiogroup"][aria-label="postEditor.publishTiming"]')!;
    expect(tags.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.compareDocumentPosition(timing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('[aria-expanded] [data-testid="audience-section"]')).toBeNull();
  });

  it("holds 발행 until a 비밀번호 post has a password, and says why", async () => {
    await render("DRAFT", { audience: "PASSWORD" });
    expect(seen.section).toMatchObject({ passwordIssue: "required", showPasswordIssue: false });
    await act(async () => button("postEditor.publish")!.click());
    expect(onSave).not.toHaveBeenCalled();
    expect(onChangeStatus).not.toHaveBeenCalled();
    expect(seen.section).toMatchObject({ showPasswordIssue: true });
  });

  it("holds 발행 on a password outside 4–200 characters", async () => {
    await render("DRAFT", { audience: "PASSWORD", password: "abc" });
    expect(seen.section).toMatchObject({ passwordIssue: "length" });
    await act(async () => button("postEditor.publish")!.click());
    expect(onChangeStatus).not.toHaveBeenCalled();
  });

  it("publishes once the password is set, or when one is already stored", async () => {
    await render("DRAFT", { audience: "PASSWORD", password: "open sesame" });
    await act(async () => button("postEditor.publish")!.click());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onChangeStatus).toHaveBeenCalledWith("publish");

    await render("DRAFT", { audience: "PASSWORD", hasPassword: true });
    await act(async () => button("postEditor.publish")!.click());
    expect(onChangeStatus).toHaveBeenCalledTimes(2);
  });

  it("holds 변경사항 저장 on a live post switched to 비밀번호 without one", async () => {
    await render("PUBLISHED", { audience: "PASSWORD", savedAudience: "PUBLIC" });
    await act(async () => button("postEditor.saveChanges")!.click());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps the dialog open after a live post becomes 링크만, so its new link shows", async () => {
    await render("PUBLISHED", { audience: "UNLISTED", savedAudience: "PUBLIC" });
    await act(async () => button("postEditor.saveChanges")!.click());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes as before when the audience didn't become 링크만", async () => {
    await render("PUBLISHED", { audience: "UNLISTED", savedAudience: "UNLISTED" });
    await act(async () => button("postEditor.saveChanges")!.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.mocked(onClose).mockClear();
    await render("PUBLISHED", { audience: "FOLLOWERS", savedAudience: "PUBLIC" });
    await act(async () => button("postEditor.saveChanges")!.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
