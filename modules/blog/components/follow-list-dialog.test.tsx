import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FollowUser } from "@/modules/blog/api/follows";
import { FollowListDialog } from "./follow-list-dialog";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  listFollowers: vi.fn(),
  listFollowing: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ authenticated: true, ready: true, me: { username: "dohyun" }, signInWithGoogle: vi.fn() }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/use-focus-trap", () => ({ useFocusTrap: () => {} }));
vi.mock("@/modules/blog/components/avatar", () => ({ Avatar: () => null }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("@/modules/blog/api/follows", () => mocks);

const person = (id: number, username: string): FollowUser => ({
  id, username, bio: null, avatarUrl: null, followerCount: 1, followedByMe: false,
});
const status = (over: { following: boolean; requested?: boolean }) => ({
  followerCount: 1, followingCount: 0, hideFollowerCount: false, ...over,
});

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

async function open() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(FollowListDialog, {
        username: "dohyun",
        open: true,
        tab: "followers",
        onTabChange: () => {},
        onOpenChange: () => {},
      }),
    );
  });
}

const rows = () => Array.from(document.querySelectorAll('[role="dialog"] li'));
const rowButton = (username: string) =>
  rows().find((li) => li.textContent?.includes(`@${username}`))!.querySelector("button")!;

describe("the followers list", () => {
  it("adds a later page without repeating someone an earlier page showed", async () => {
    mocks.listFollowers.mockImplementation(async (_: string, page: number) =>
      page === 0
        ? { items: [person(1, "haneul"), person(2, "minseo")], page: 0, size: 2, hasNext: true }
        : { items: [person(2, "minseo"), person(3, "yuna")], page: 1, size: 2, hasNext: false },
    );
    await open();
    const more = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "publicPost.loadMore")!;
    await act(async () => more.click());
    expect(rows().map((li) => li.querySelector("a")?.textContent)).toEqual(["@haneul", "@minseo", "@yuna"]);
  });

  it("shows a locked writer's row as requested, not following", async () => {
    mocks.listFollowers.mockResolvedValue({ items: [person(4, "haruka")], page: 0, size: 20, hasNext: false });
    mocks.followUser.mockResolvedValue(status({ following: false, requested: true }));
    await open();
    await act(async () => rowButton("haruka").click());
    expect(mocks.followUser).toHaveBeenCalledWith("haruka");
    expect(rowButton("haruka").textContent).toBe("publicPost.requested");
    expect(rowButton("haruka").getAttribute("aria-pressed")).toBe("true");
    expect(mocks.toast).toHaveBeenCalledWith("publicPost.followRequestedToast");

    mocks.unfollowUser.mockResolvedValue(status({ following: false, requested: false }));
    await act(async () => rowButton("haruka").click());
    expect(mocks.unfollowUser).toHaveBeenCalledWith("haruka");
    expect(rowButton("haruka").textContent).toBe("publicPost.follow");
  });

  it("puts the row back and says so when the follow fails", async () => {
    mocks.listFollowers.mockResolvedValue({ items: [person(3, "yuna")], page: 0, size: 20, hasNext: false });
    mocks.followUser.mockRejectedValue(new TypeError("Failed to fetch"));
    await open();
    await act(async () => rowButton("yuna").click());
    expect(rowButton("yuna").textContent).toBe("publicPost.follow");
    expect(mocks.toast).toHaveBeenCalledWith("publicPost.followError", "error");
  });
});
