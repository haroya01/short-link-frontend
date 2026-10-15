import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteAccount } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  blocked: [] as { id: number; username: string; avatarUrl: string | null }[],
  refreshBlockedUsers: vi.fn(),
  unblockAuthor: vi.fn(),
  listRemoteBlocks: vi.fn(),
  setRemoteBlocked: vi.fn(),
  listMutedUsers: vi.fn(),
  unmuteUser: vi.fn(),
  listRemoteMutes: vi.fn(),
  unmuteRemote: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) => {
    const value = values && (values.username ?? values.when);
    return value ? `${namespace}.${key}:${value}` : `${namespace}.${key}`;
  },
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("@/modules/blog/lib/user-blocks", () => ({
  useBlockedUsers: () => mocks.blocked,
  refreshBlockedUsers: mocks.refreshBlockedUsers,
  unblockAuthor: mocks.unblockAuthor,
}));
vi.mock("@/modules/notes/api/notes", () => ({
  listMutedUsers: mocks.listMutedUsers,
  unmuteUser: mocks.unmuteUser,
}));
vi.mock("@/modules/notes/api/remote-safety", () => ({
  listRemoteBlocks: mocks.listRemoteBlocks,
  setRemoteBlocked: mocks.setRemoteBlocked,
  listRemoteMutes: mocks.listRemoteMutes,
  unmuteRemote: mocks.unmuteRemote,
}));
vi.mock("./scheduled-notes", () => ({ useWhen: () => (iso: string) => `when(${iso})` }));

import { BlockedUserSettings } from "./blocked-user-settings";
import { MutedAccountSettings } from "./muted-account-settings";

const remote = (id: number, acct: string): RemoteAccount => {
  const [username, domain] = acct.split("@");
  return {
    id,
    acct,
    username,
    domain,
    displayName: null,
    avatarUrl: null,
    url: `https://${domain}/@${username}`,
    following: false,
    requested: false,
    blocking: true,
    muting: true,
  };
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.blocked = [];
  mocks.refreshBlockedUsers.mockResolvedValue(undefined);
  mocks.listRemoteBlocks.mockResolvedValue([]);
  mocks.listMutedUsers.mockResolvedValue([]);
  mocks.listRemoteMutes.mockResolvedValue([]);
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

async function show(element: React.ReactElement) {
  await act(async () => root.render(element));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

const rows = (testId: string) =>
  Array.from(host.querySelectorAll(`[data-testid="${testId}"] li`)).map((li) => li.querySelector("a")!.textContent);
const button = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

describe("blocked accounts in settings", () => {
  it("lists accounts elsewhere under their own label, below the members", async () => {
    mocks.blocked = [{ id: 2, username: "minji", avatarUrl: null }];
    mocks.listRemoteBlocks.mockResolvedValue([remote(9804, "deals@spam.example")]);
    await show(<BlockedUserSettings />);
    expect(host.textContent).toContain("@minji");
    expect(host.querySelector("h3")!.textContent).toBe("notes.remoteSection");
    expect(rows("remote-blocks")).toEqual(["D@deals@spam.example"]);
    expect(host.querySelector('[data-testid="remote-blocks"] a')!.getAttribute("href")).toMatch(/\/remote\/9804$/);
    expect(host.textContent!.indexOf("@minji")).toBeLessThan(host.textContent!.indexOf("@deals@spam.example"));
  });

  it("unblocks an account elsewhere in place", async () => {
    mocks.listRemoteBlocks.mockResolvedValue([remote(9804, "deals@spam.example")]);
    mocks.setRemoteBlocked.mockResolvedValue({ ...remote(9804, "deals@spam.example"), blocking: false });
    await show(<BlockedUserSettings />);
    await act(async () => button("notes.unblockUser:deals@spam.example")!.click());
    expect(mocks.setRemoteBlocked).toHaveBeenCalledWith(9804, false);
    expect(mocks.toast).toHaveBeenCalledWith("notes.unblockedToast:deals@spam.example");
    expect(host.textContent).toContain("notes.blockedUsersEmpty");
  });

  it("keeps the row and says so when unblocking fails", async () => {
    mocks.listRemoteBlocks.mockResolvedValue([remote(9804, "deals@spam.example")]);
    mocks.setRemoteBlocked.mockRejectedValue(new Error("down"));
    await show(<BlockedUserSettings />);
    await act(async () => button("notes.unblockUser:deals@spam.example")!.click());
    expect(mocks.toast).toHaveBeenCalledWith("notes.unblockFailed", "error");
    expect(rows("remote-blocks")).toHaveLength(1);
  });

  it("shows only the members on a backend without the list elsewhere", async () => {
    mocks.blocked = [{ id: 2, username: "minji", avatarUrl: null }];
    mocks.listRemoteBlocks.mockResolvedValue(null);
    await show(<BlockedUserSettings />);
    expect(host.textContent).toContain("@minji");
    expect(host.textContent).not.toContain("notes.remoteSection");
  });

  it("says nobody is blocked only when neither list has anyone", async () => {
    await show(<BlockedUserSettings />);
    expect(host.textContent).toContain("notes.blockedUsersEmpty");
  });
});

describe("muted accounts in settings", () => {
  it("lists members and accounts elsewhere with when each mute ends", async () => {
    mocks.listMutedUsers.mockResolvedValue([
      { id: 13, username: "haruki", avatarUrl: null, notifications: true, expiresAt: null },
    ]);
    mocks.listRemoteMutes.mockResolvedValue([
      { account: remote(9805, "ren@mastodon.online"), expiresAt: "2026-10-16T09:00:00Z", notifications: false },
    ]);
    await show(<MutedAccountSettings />);
    expect(rows("muted-users")).toEqual(["H@harukinotes.muteForever"]);
    expect(rows("remote-mutes")).toEqual(["R@ren@mastodon.onlinenotes.mutedUntil:when(2026-10-16T09:00:00Z)"]);
    expect(host.querySelector("h3")!.textContent).toBe("notes.remoteSection");
  });

  it("unmutes a member and an account elsewhere in place", async () => {
    mocks.listMutedUsers.mockResolvedValue([
      { id: 13, username: "haruki", avatarUrl: null, notifications: true, expiresAt: null },
    ]);
    mocks.listRemoteMutes.mockResolvedValue([
      { account: remote(9805, "ren@mastodon.online"), expiresAt: null, notifications: true },
    ]);
    mocks.unmuteUser.mockResolvedValue(undefined);
    mocks.unmuteRemote.mockResolvedValue(remote(9805, "ren@mastodon.online"));
    await show(<MutedAccountSettings />);
    await act(async () => button("notes.unmuteUser:ren@mastodon.online")!.click());
    expect(mocks.unmuteRemote).toHaveBeenCalledWith(9805);
    expect(mocks.toast).toHaveBeenLastCalledWith("notes.unmutedToast:ren@mastodon.online");
    expect(host.textContent).not.toContain("notes.remoteSection");
    await act(async () => button("notes.unmuteUser:haruki")!.click());
    expect(mocks.unmuteUser).toHaveBeenCalledWith("haruki");
    expect(host.textContent).toContain("notes.mutedUsersEmpty");
  });

  it("shows only the members on a backend without the list elsewhere", async () => {
    mocks.listMutedUsers.mockResolvedValue([
      { id: 13, username: "haruki", avatarUrl: null, notifications: true, expiresAt: null },
    ]);
    mocks.listRemoteMutes.mockResolvedValue(null);
    await show(<MutedAccountSettings />);
    expect(rows("muted-users")).toHaveLength(1);
    expect(host.textContent).not.toContain("notes.remoteSection");
  });

  it("says nobody is muted only when both lists answered empty", async () => {
    await show(<MutedAccountSettings />);
    expect(host.textContent).toContain("notes.mutedUsersEmpty");
  });

  it("offers a retry instead of an empty list when the members' list cannot be read", async () => {
    mocks.listMutedUsers.mockRejectedValueOnce(new Error("down"));
    await show(<MutedAccountSettings />);
    expect(host.textContent).not.toContain("notes.mutedUsersEmpty");
    mocks.listMutedUsers.mockResolvedValue([
      { id: 13, username: "haruki", avatarUrl: null, notifications: true, expiresAt: null },
    ]);
    await act(async () => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "common.retry")!.click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(rows("muted-users")).toHaveLength(1);
  });
});
