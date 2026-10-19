import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFollowStatus: vi.fn(),
  listBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  auth: { authenticated: true, ready: true, me: { id: 1, username: "dohyun" } as { id: number; username: string } | null },
}));

vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ...mocks.auth, signInWithGoogle: vi.fn() }),
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
  mocks.auth = { authenticated: true, ready: true, me: { id: 1, username: "dohyun" } };
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

describe("the follow button before the status arrives", () => {
  async function mount(username: string) {
    const { FollowButton } = await import("./follow-button");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    return (count: number) => createElement("div", null, ...Array.from({ length: count }, (_, i) => createElement(FollowButton, { key: i, username, initialFollowerCount: 10 })));
  }
  const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('[data-testid="follow-button"]')];

  it("keeps its place but shows no 팔로우 until the status says, then reads 팔로잉 without a pop", async () => {
    let answer: (status: object) => void = () => {};
    mocks.getFollowStatus.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const tree = await mount("yuna");
    await act(async () => root.render(tree(1)));
    const [pending] = buttons();
    expect(pending.classList.contains("invisible")).toBe(true);
    expect(pending.disabled).toBe(true);
    expect(pending.getAttribute("aria-hidden")).toBe("true");

    await act(async () => answer({ following: true, followerCount: 10, hideFollowerCount: false }));
    const [shown] = buttons();
    expect(shown.textContent).toBe("publicPost.following");
    expect(shown.classList.contains("invisible")).toBe(false);
    expect(shown.disabled).toBe(false);
    expect(shown.querySelector(".subscribe-pop")).toBeNull();
  });

  it("a second button for the same author shows the known state on its first paint", async () => {
    let calls = 0;
    mocks.getFollowStatus.mockImplementation(() => (++calls === 1 ? Promise.resolve({ following: true, followerCount: 10, hideFollowerCount: false }) : new Promise(() => {})));
    const tree = await mount("yuna");
    await act(async () => root.render(tree(1)));
    window.sessionStorage.clear();
    await act(async () => root.render(tree(2)));
    const [, late] = buttons();
    expect(late.classList.contains("invisible")).toBe(false);
    expect(late.textContent).toBe("publicPost.following");
  });

  it("shows 팔로우 at once to a signed-out reader, who follows no one", async () => {
    mocks.auth = { authenticated: false, ready: true, me: null };
    mocks.getFollowStatus.mockReturnValue(new Promise(() => {}));
    const tree = await mount("yuna");
    await act(async () => root.render(tree(1)));
    const [button] = buttons();
    expect(button.classList.contains("invisible")).toBe(false);
    expect(button.textContent).toBe("publicPost.follow");
  });
});
