import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { LikeButton } from "./like-button";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  like: vi.fn(),
  translated: new Set(["POST_INTERACTION_BLOCKED", "ACCOUNT_SUSPENDED"]),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const t = (key: string) => `${namespace}.${key}`;
    t.has = (key: string) => namespace === "errors" && mocks.translated.has(key);
    return t;
  },
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ authenticated: true, ready: true, signInWithGoogle: vi.fn() }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/modules/blog/api/likes", () => ({
  getLikeStatus: () => Promise.resolve({ likeCount: 3, liked: false }),
  likePost: mocks.like,
  unlikePost: () => Promise.resolve({ likeCount: 3, liked: false }),
}));

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function mountAndClick(postId: number) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(LikeButton, { postId, initialCount: 3 }));
  });
  const button = host.querySelector("button")!;
  await act(async () => {
    button.click();
  });
  return button;
}

describe("like failure", () => {
  it("says the author blocked the reaction instead of asking to retry", async () => {
    mocks.like.mockRejectedValueOnce(
      new ApiError(403, {
        title: "Forbidden",
        status: 403,
        detail: "you can't interact — this author has blocked you",
        code: "POST_INTERACTION_BLOCKED",
      }),
    );
    const button = await mountAndClick(101);
    expect(mocks.toast).toHaveBeenCalledWith("errors.POST_INTERACTION_BLOCKED", "error");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("says the like didn't go through when the server gave no reason", async () => {
    mocks.like.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const button = await mountAndClick(102);
    expect(mocks.toast).toHaveBeenCalledWith("errors.likeFailed", "error");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
