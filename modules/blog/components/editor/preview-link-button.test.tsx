import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewLinkButton, PreviewOpenButton } from "./preview-link-button";

const mocks = vi.hoisted(() => ({
  save: vi.fn(), getPost: vi.fn(), issuePreviewToken: vi.fn(), writeText: vi.fn(), toast: vi.fn(),
  postHref: vi.fn(),
}));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/modules/blog/api/posts", () => ({ getPost: mocks.getPost, issuePreviewToken: mocks.issuePreviewToken }));
vi.mock("@/modules/blog/lib/author-href", () => ({ postHref: mocks.postHref }));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mocks.writeText } });
  mocks.save.mockResolvedValue(true);
  mocks.getPost.mockResolvedValue({ slug: "persisted-slug" });
  mocks.issuePreviewToken.mockResolvedValue({ token: "preview-token" });
  mocks.postHref.mockReturnValue("https://blog.kurl.me/@writer/persisted-slug");
  mocks.writeText.mockResolvedValue(undefined);
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(PreviewLinkButton, { postId: 16, username: "writer", onSave: mocks.save }));
  });
}

describe("draft preview sharing", () => {
  it("waits for saving, then copies the canonical URL with the persisted slug", async () => {
    let finishSave!: (saved: boolean) => void;
    mocks.save.mockReturnValueOnce(new Promise<boolean>((resolve) => { finishSave = resolve; }));
    await mount();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(mocks.issuePreviewToken).not.toHaveBeenCalled();
    expect(mocks.writeText).not.toHaveBeenCalled();
    await act(async () => { finishSave(true); });
    expect(mocks.postHref).toHaveBeenCalledWith("writer", "persisted-slug", "en");
    expect(mocks.writeText).toHaveBeenCalledWith("https://blog.kurl.me/@writer/persisted-slug?preview=preview-token");
  });

  it("does not copy or issue a token when the current draft failed to save", async () => {
    mocks.save.mockResolvedValueOnce(false);
    await mount();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(mocks.issuePreviewToken).not.toHaveBeenCalled();
    expect(mocks.writeText).not.toHaveBeenCalled();
    expect(host.querySelector("button")!.disabled).toBe(false);
  });

  it("resolves the development route against the current origin", async () => {
    mocks.postHref.mockReturnValue("/en/p/writer/persisted-slug");
    await mount();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(mocks.writeText).toHaveBeenCalledWith(`${window.location.origin}/en/p/writer/persisted-slug?preview=preview-token`);
  });
});

describe("opening the draft preview", () => {
  async function mountOpen() {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(createElement(PreviewOpenButton, { postId: 16, username: "writer", onSave: mocks.save }));
    });
  }

  it("opens the tab inside the click, then points it at the saved draft's token link", async () => {
    const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
    const open = vi.fn(() => tab);
    vi.stubGlobal("open", open);
    let finishSave!: (saved: boolean) => void;
    mocks.save.mockReturnValueOnce(new Promise<boolean>((resolve) => { finishSave = resolve; }));
    await mountOpen();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(tab.location.href).toBe("");
    await act(async () => { finishSave(true); });
    expect(tab.location.href).toBe("https://blog.kurl.me/@writer/persisted-slug?preview=preview-token");
    expect(tab.opener).toBeNull();
  });

  it("closes the tab it opened when the draft failed to save", async () => {
    const tab = { opener: null, location: { href: "" }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => tab));
    mocks.save.mockResolvedValueOnce(false);
    await mountOpen();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(tab.close).toHaveBeenCalled();
    expect(mocks.issuePreviewToken).not.toHaveBeenCalled();
  });

  it("opens the link itself when a blocker refused the early tab", async () => {
    const open = vi.fn<(url?: string, target?: string, features?: string) => null>(() => null);
    vi.stubGlobal("open", open);
    await mountOpen();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(open).toHaveBeenLastCalledWith(
      "https://blog.kurl.me/@writer/persisted-slug?preview=preview-token",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("closes the tab and says so when the token can't be issued", async () => {
    const tab = { opener: null, location: { href: "" }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => tab));
    mocks.issuePreviewToken.mockRejectedValueOnce(new Error("down"));
    await mountOpen();
    await act(async () => { host.querySelector("button")!.click(); });
    expect(tab.close).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), "error");
  });
});

