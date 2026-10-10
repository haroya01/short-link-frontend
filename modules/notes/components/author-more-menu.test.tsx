import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  listBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  auth: { authenticated: true, ready: true, me: { id: 1, username: "dohyun" } as { id: number; username: string } | null },
  report: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: { username?: string }) =>
    values?.username ? `${namespace}.${key}:${values.username}` : `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [mocks.confirm, null] }));
vi.mock("@/modules/notes/api/notes", () => ({
  getMuteStatus: () => Promise.resolve({ muted: false, notifications: false, expiresAt: null }),
  getRepostVisibility: () => Promise.resolve({ hidden: false }),
  setRepostsHidden: vi.fn(),
  unmuteUser: vi.fn(),
}));
vi.mock("@/modules/blog/api/follows", () => ({
  listBlockedUsers: mocks.listBlockedUsers,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
}));
vi.mock("./mute-dialog", () => ({ MuteDialog: () => null }));
vi.mock("./note-list-membership-dialog", () => ({ NoteListMembershipDialog: () => null }));
vi.mock("@/modules/blog/components/report-button", () => ({
  ReportButton: (props: { subjectType: string; subjectId: number; open: boolean }) => {
    mocks.report(props);
    return null;
  },
}));

let root: Root;
let host: HTMLDivElement;
let AuthorMoreMenu: typeof import("./author-more-menu").AuthorMoreMenu;

beforeEach(async () => {
  vi.resetModules();
  ({ AuthorMoreMenu } = await import("./author-more-menu"));
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.blockUser.mockResolvedValue(undefined);
  mocks.unblockUser.mockResolvedValue(undefined);
  mocks.auth = { authenticated: true, ready: true, me: { id: 1, username: "dohyun" } };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function openMenu(username: string) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(AuthorMoreMenu, { username, userId: 42 })));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!.click());
}

const item = (label: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((b) => b.textContent === label);

describe("blocking from the author menu", () => {
  it("asks first, telling that follows end both ways, then blocks", async () => {
    mocks.listBlockedUsers.mockResolvedValue([]);
    mocks.confirm.mockResolvedValue(true);
    await openMenu("yuna");
    await act(async () => item("notes.blockMenu")!.click());

    expect(mocks.confirm).toHaveBeenCalledWith({
      title: "notes.blockTitle:yuna",
      description: "notes.blockHint",
      confirmLabel: "notes.block",
      destructive: true,
    });
    expect(mocks.blockUser).toHaveBeenCalledWith("yuna");
    expect(mocks.toast).toHaveBeenCalledWith("notes.blockedToast:yuna");
  });

  it("does nothing when the confirmation is declined", async () => {
    mocks.listBlockedUsers.mockResolvedValue([]);
    mocks.confirm.mockResolvedValue(false);
    await openMenu("kazuki");
    await act(async () => item("notes.blockMenu")!.click());
    expect(mocks.blockUser).not.toHaveBeenCalled();
  });

  it("offers to unblock someone already blocked", async () => {
    mocks.listBlockedUsers.mockResolvedValue([{ id: 9, username: "mallory", avatarUrl: null }]);
    await openMenu("mallory");
    expect(item("notes.blockMenu")).toBeUndefined();
    await act(async () => item("notes.unblock")!.click());
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.unblockUser).toHaveBeenCalledWith("mallory");
    expect(mocks.toast).toHaveBeenCalledWith("notes.unblockedToast:mallory");
  });
});

describe("reporting from the author menu", () => {
  const items = () => Array.from(host.querySelectorAll('[role="menuitem"]')).map((b) => b.textContent);

  it("ends the menu with a report that opens the user report", async () => {
    mocks.listBlockedUsers.mockResolvedValue([]);
    await openMenu("yuna");
    expect(items().at(-1)).toBe("publicPost.report");
    await act(async () => item("publicPost.report")!.click());
    expect(mocks.report).toHaveBeenLastCalledWith(expect.objectContaining({ subjectType: "USER", subjectId: 42, open: true }));
    expect(host.querySelector('[role="menu"]')).toBeNull();
  });

  it("gives a signed-out reader the menu with only the report", async () => {
    mocks.auth = { authenticated: false, ready: true, me: null };
    await openMenu("yuna");
    expect(items()).toEqual(["publicPost.report"]);
  });

  it("has no menu on my own profile", async () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(createElement(AuthorMoreMenu, { username: "dohyun", userId: 1 })));
    expect(host.querySelector('button[aria-haspopup="menu"]')).toBeNull();
  });
});
