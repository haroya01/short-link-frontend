import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteAccount } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, ready: true },
  toast: vi.fn(),
  confirm: vi.fn(),
  getRemoteAccount: vi.fn(),
  setRemoteBlocked: vi.fn(),
  muteRemote: vi.fn(),
  unmuteRemote: vi.fn(),
  muteDialog: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) => {
    const value = values && (values.acct ?? values.username ?? values.domain);
    return value ? `${namespace}.${key}:${value}` : `${namespace}.${key}`;
  },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: vi.fn() }));
vi.mock("@/components/auth/sign-in-empty-state", () => ({ SignInEmptyState: () => null }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [mocks.confirm, null] }));
vi.mock("@/modules/notes/api/notes", () => ({
  getRemoteAccount: mocks.getRemoteAccount,
  listDomainBlocks: vi.fn(),
  listRemoteAccountNotes: vi.fn(),
  listRemoteFollowing: vi.fn(),
  setDomainBlocked: vi.fn(),
  setRemoteFollow: vi.fn(),
}));
vi.mock("@/modules/notes/api/remote-safety", async (original) => ({
  ...(await original<typeof import("@/modules/notes/api/remote-safety")>()),
  setRemoteBlocked: mocks.setRemoteBlocked,
  muteRemote: mocks.muteRemote,
  unmuteRemote: mocks.unmuteRemote,
}));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("./note-list", () => ({ NoteList: () => createElement("div", { "data-testid": "notes" }) }));
vi.mock("./mute-dialog", () => ({
  MuteDialog: (props: {
    open: boolean;
    subject: string;
    hint: string;
    mute: (notifications: boolean, duration: number | null) => Promise<void>;
  }) => {
    mocks.muteDialog(props);
    return null;
  },
}));

import { RemoteAccountScreen } from "./remote-account";

const mina: RemoteAccount = {
  id: 9800,
  acct: "mina@mastodon.social",
  username: "mina",
  domain: "mastodon.social",
  displayName: "Mina",
  avatarUrl: null,
  url: "https://mastodon.social/@mina",
  following: true,
  requested: false,
  domainBlocked: false,
  blocking: false,
  muting: false,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
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

async function open(account: RemoteAccount) {
  mocks.getRemoteAccount.mockResolvedValue(account);
  await act(async () => root.render(<RemoteAccountScreen id={account.id} />));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function openMenu() {
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!.click());
}

const items = () => Array.from(host.querySelectorAll('[role="menuitem"]')).map((b) => b.textContent);
const item = (label: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((b) => b.textContent === label);
const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === label);
const lastMuteDialog = () => mocks.muteDialog.mock.calls.at(-1)![0];

describe("the account menu on another server", () => {
  it("offers mute and block for the account before blocking its whole server", async () => {
    await open(mina);
    await openMenu();
    expect(items()).toEqual(["notes.muteMenu", "notes.blockMenu", "notes.domainBlock:mastodon.social"]);
  });

  it("keeps only the server block on a backend that does not send block and mute", async () => {
    const { blocking: _blocking, muting: _muting, ...old } = mina;
    await open(old);
    await openMenu();
    expect(items()).toEqual(["notes.domainBlock:mastodon.social"]);
  });

  it("asks first, then blocks: the follow, the caption and the notes give way to one line and a way back", async () => {
    mocks.confirm.mockResolvedValue(true);
    mocks.setRemoteBlocked.mockResolvedValue({ ...mina, following: false, blocking: true });
    await open(mina);
    expect(host.querySelector('[data-testid="notes"]')).not.toBeNull();
    await openMenu();
    await act(async () => item("notes.blockMenu")!.click());

    expect(mocks.confirm).toHaveBeenCalledWith({
      title: "notes.blockTitle:mina@mastodon.social",
      description: "notes.remoteBlockHint",
      confirmLabel: "notes.block",
      destructive: true,
    });
    expect(mocks.setRemoteBlocked).toHaveBeenCalledWith(9800, true);
    expect(mocks.toast).toHaveBeenCalledWith("notes.remoteBlockedToast:mina@mastodon.social");
    expect(host.textContent).toContain("notes.remoteBlockedTitle");
    expect(host.querySelector('[data-testid="notes"]')).toBeNull();
    expect(button("notes.remoteFollowing")).toBeUndefined();
    expect(host.textContent).not.toContain("notes.remoteCaptionFollowing");

    mocks.setRemoteBlocked.mockResolvedValue({ ...mina, following: false, blocking: false });
    await act(async () => button("notes.unblock")!.click());
    expect(mocks.setRemoteBlocked).toHaveBeenLastCalledWith(9800, false);
    expect(mocks.toast).toHaveBeenLastCalledWith("notes.unblockedToast:mina@mastodon.social");
    expect(host.querySelector('[data-testid="notes"]')).not.toBeNull();
    expect(host.textContent).not.toContain("notes.remoteBlockedTitle");
  });

  it("does not block when the confirmation is declined", async () => {
    mocks.confirm.mockResolvedValue(false);
    await open(mina);
    await openMenu();
    await act(async () => item("notes.blockMenu")!.click());
    expect(mocks.setRemoteBlocked).not.toHaveBeenCalled();
  });

  it("says when the block did not go through and keeps the notes", async () => {
    mocks.confirm.mockResolvedValue(true);
    mocks.setRemoteBlocked.mockRejectedValue(new Error("down"));
    await open(mina);
    await openMenu();
    await act(async () => item("notes.blockMenu")!.click());
    expect(mocks.toast).toHaveBeenCalledWith("notes.blockFailed", "error");
    expect(host.querySelector('[data-testid="notes"]')).not.toBeNull();
  });

  it("opens the shared mute dialog with the account's handle and the remote hint, and keeps the notes once muted", async () => {
    mocks.muteRemote.mockResolvedValue({ ...mina, muting: true });
    await open(mina);
    await openMenu();
    await act(async () => item("notes.muteMenu")!.click());
    expect(lastMuteDialog()).toMatchObject({
      open: true,
      subject: "mina@mastodon.social",
      hint: "notes.remoteMuteHint:mina@mastodon.social",
    });

    await act(async () => lastMuteDialog().mute(false, 86_400));
    expect(mocks.muteRemote).toHaveBeenCalledWith(9800, false, 86_400);
    expect(host.querySelector('[data-testid="notes"]')).not.toBeNull();
    await openMenu();
    expect(items()[0]).toBe("notes.unmute");
  });

  it("unmutes in one step from the menu", async () => {
    mocks.unmuteRemote.mockResolvedValue(mina);
    await open({ ...mina, muting: true });
    await openMenu();
    await act(async () => item("notes.unmute")!.click());
    expect(mocks.unmuteRemote).toHaveBeenCalledWith(9800);
    expect(mocks.toast).toHaveBeenCalledWith("notes.unmutedToast:mina@mastodon.social");
    await openMenu();
    expect(items()[0]).toBe("notes.muteMenu");
  });

  it("opens an account the viewer already blocked on the blocked line, with unblock in the menu", async () => {
    await open({ ...mina, following: false, blocking: true });
    expect(host.textContent).toContain("notes.remoteBlockedTitle");
    expect(host.querySelector('[data-testid="notes"]')).toBeNull();
    await openMenu();
    expect(items()).toEqual(["notes.muteMenu", "notes.unblock", "notes.domainBlock:mastodon.social"]);
  });

  it("leaves account-level items out while the whole server is blocked", async () => {
    await open({ ...mina, following: false, domainBlocked: true });
    await openMenu();
    expect(items()).toEqual(["notes.domainUnblock:mastodon.social"]);
  });
});

describe("the link to the account on its own server", () => {
  const serverLink = () =>
    Array.from(host.querySelectorAll("a")).find((a) => a.textContent === "notes.remoteOpenOnServer:mastodon.social");

  it("opens the account's web page", async () => {
    await open(mina);
    expect(serverLink()?.getAttribute("href")).toBe("https://mastodon.social/@mina");
  });

  it("drops the link when the server sends a non-web address", async () => {
    for (const [i, url] of ["javascript:alert(1)", "data:text/html,x", " javascript:alert(1)"].entries()) {
      await open({ ...mina, id: 9900 + i, url });
      expect(host.textContent).toContain("Mina");
      expect(serverLink()).toBeUndefined();
      expect(host.querySelector('a[href^="javascript"], a[href^="data"]')).toBeNull();
    }
    expect(mocks.getRemoteAccount.mock.calls.map(([id]) => id)).toEqual([9900, 9901, 9902]);
  });
});
