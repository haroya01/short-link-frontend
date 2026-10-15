import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFollowStatus: vi.fn(),
  listBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ authenticated: true, ready: true, me: { id: 1, username: "dohyun" }, signInWithGoogle: vi.fn() }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/modules/blog/api/follows", () => ({
  getFollowStatus: mocks.getFollowStatus,
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  setNoteNotifications: vi.fn(),
  listBlockedUsers: mocks.listBlockedUsers,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  window.sessionStorage.clear();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.getFollowStatus.mockResolvedValue({ following: true, followerCount: 10, hideFollowerCount: false });
  let server: string[] = [];
  mocks.listBlockedUsers.mockImplementation(async () => server.map((username, id) => ({ id, username, avatarUrl: null })));
  mocks.blockUser.mockImplementation(async (username: string) => { server = [username, ...server]; });
  mocks.unblockUser.mockImplementation(async (username: string) => { server = server.filter((u) => u !== username); });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

describe("the follow button of a blocked author", () => {
  it("goes away on block and comes back as 팔로우, since the block ended the follow", async () => {
    const { FollowButton } = await import("./follow-button");
    const { blockAuthor, unblockAuthor } = await import("@/modules/blog/lib/user-blocks");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(createElement(FollowButton, { username: "yuna", initialFollowerCount: 10 })));
    const button = () => host.querySelector<HTMLButtonElement>('[data-testid="follow-button"]');
    expect(button()?.textContent).toBe("publicPost.following");

    await act(async () => { await blockAuthor("yuna"); });
    expect(button()).toBeNull();

    await act(async () => { await unblockAuthor("yuna"); });
    expect(button()?.textContent).toBe("publicPost.follow");
    expect(JSON.parse(window.sessionStorage.getItem("kurl:follow:yuna") ?? "{}").following).toBe(false);
  });
});
