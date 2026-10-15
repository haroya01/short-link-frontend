import React, { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchFollowStatus = vi.fn();

vi.mock("next-intl", () => {
  const t = (key: string) => key;
  t.rich = (key: string, values: { count: number; n: (c: ReactNode) => ReactNode }) =>
    createElement("span", { "data-key": key }, `${key} `, values.n(String(values.count)));
  return { useTranslations: () => t };
});
vi.mock("@/modules/blog/lib/follow-status-cache", () => ({ fetchFollowStatus: (u: string) => fetchFollowStatus(u) }));
vi.mock("./follow-list-dialog", () => ({ FollowListDialog: () => null }));

import { FollowCounts } from "./follow-counts";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  sessionStorage.clear();
  fetchFollowStatus.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const row = () => host.querySelector<HTMLElement>("[data-profile-counts]");
const buttons = () => [...host.querySelectorAll("button")].map((b) => b.textContent);
const posts = <span data-posts>countPosts 3</span>;

describe("the profile counts row", () => {
  it("shows every viewer the follower and following numbers, then the post count", async () => {
    fetchFollowStatus.mockResolvedValue({ following: false, followerCount: 128, followingCount: 12, hideFollowerCount: false });
    await render(<FollowCounts username="minji" trailing={posts} />);
    expect(buttons()).toEqual(["countFollowers 128", "countFollowing 12"]);
    expect(host.querySelector("button span.font-semibold")!.textContent).toBe("128");
    expect(row()!.lastElementChild!.textContent).toBe("countPosts 3");
    expect(row()!.hasAttribute("inert")).toBe(false);
  });

  it("drops the whole pair when the author hides their counts, leaving the post count", async () => {
    fetchFollowStatus.mockResolvedValue({ following: false, hideFollowerCount: true });
    await render(<FollowCounts username="sora" trailing={posts} />);
    expect(host.querySelectorAll("button")).toHaveLength(0);
    expect(row()!.textContent).toBe("countPosts 3");
  });

  it("treats a response without the count keys like a hidden author", async () => {
    fetchFollowStatus.mockResolvedValue({ following: false, hideFollowerCount: false });
    await render(<FollowCounts username="sora" trailing={posts} />);
    expect(host.querySelectorAll("button")).toHaveLength(0);
  });

  it("drops the pair when the lookup fails, rather than showing labels without numbers", async () => {
    fetchFollowStatus.mockRejectedValue(new Error("down"));
    await render(<FollowCounts username="minji" trailing={posts} />);
    expect(host.querySelectorAll("button")).toHaveLength(0);
    expect(row()!.textContent).toBe("countPosts 3");
    expect(row()!.hasAttribute("inert")).toBe(false);
  });

  it("renders nothing for a hidden author with no posts", async () => {
    fetchFollowStatus.mockResolvedValue({ following: false, hideFollowerCount: true });
    await render(<FollowCounts username="sora" />);
    expect(host.innerHTML).toBe("");
  });

  it("stays invisible and inert until the counts are known", async () => {
    fetchFollowStatus.mockReturnValue(new Promise(() => {}));
    await render(<FollowCounts username="minji" trailing={posts} />);
    expect(row()!.hasAttribute("inert")).toBe(true);
    expect(row()!.className).toContain("opacity-0");
  });
});
