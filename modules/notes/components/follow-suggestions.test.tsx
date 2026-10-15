import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteAccount } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, ready: true },
  listFollowSuggestions: vi.fn(),
  listRemoteSuggestions: vi.fn(),
  setRemoteFollow: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [vi.fn(), null] }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("@/modules/blog/components/follow-button", () => ({
  FollowButton: ({ username }: { username: string }) => createElement("button", { "data-follow": username }),
}));
vi.mock("@/modules/notes/api/follow-suggestions", () => ({
  listFollowSuggestions: mocks.listFollowSuggestions,
  dismissFollowSuggestion: vi.fn(),
}));
vi.mock("@/modules/notes/api/remote-safety", () => ({ listRemoteSuggestions: mocks.listRemoteSuggestions }));
vi.mock("@/modules/notes/api/notes", () => ({ setRemoteFollow: mocks.setRemoteFollow }));
vi.mock("./note-list", () => ({ NoteList: () => null }));

import { FollowSuggestions } from "./follow-suggestions";

const sora: RemoteAccount = {
  id: 9802,
  acct: "sora@fosstodon.org",
  username: "sora",
  domain: "fosstodon.org",
  displayName: "Sora",
  avatarUrl: null,
  url: "https://fosstodon.org/@sora",
  following: false,
  requested: false,
};
const haruka = {
  userId: 3,
  username: "haruka",
  displayName: "하루카",
  avatarUrl: null,
  bio: null,
  mutuals: 3,
  reason: "FRIENDS" as const,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { authenticated: true, ready: true };
  mocks.listFollowSuggestions.mockResolvedValue([haruka]);
  mocks.listRemoteSuggestions.mockResolvedValue([sora]);
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

async function show() {
  await act(async () => root.render(<FollowSuggestions />));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

const elsewhere = () => host.querySelector('[data-testid="remote-suggestions"]');

describe("follow suggestions from other servers", () => {
  it("adds a group below the people here, each with its server and a follow", async () => {
    await show();
    const group = elsewhere()!;
    expect(group.querySelector("h3")!.textContent).toBe("notes.remoteSection");
    const row = group.querySelector('[data-testid="remote-suggestion-sora@fosstodon.org"]')!;
    expect(row.querySelector("a")!.getAttribute("href")).toMatch(/\/remote\/9802$/);
    expect(row.textContent).toContain("@sora@fosstodon.org");
    expect(host.querySelector('[data-testid="suggestion-haruka"]')!.compareDocumentPosition(group)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(mocks.listRemoteSuggestions).toHaveBeenCalledWith(3);
  });

  it("sends a follow request from the row and shows it as requested", async () => {
    mocks.setRemoteFollow.mockResolvedValue({ ...sora, requested: true });
    await show();
    const follow = Array.from(elsewhere()!.querySelectorAll("button")).find((b) => b.textContent === "notes.remoteFollow")!;
    await act(async () => follow.click());
    expect(mocks.setRemoteFollow).toHaveBeenCalledWith(9802, true);
    expect(elsewhere()!.textContent).toContain("notes.remoteRequested");
  });

  it("stands on the group elsewhere alone when nobody here is suggested", async () => {
    mocks.listFollowSuggestions.mockResolvedValue([]);
    await show();
    expect(host.querySelector('[data-testid="follow-suggestions"]')).not.toBeNull();
    expect(elsewhere()).not.toBeNull();
    expect(host.querySelector("ul li[data-testid^='suggestion-']")).toBeNull();
  });

  it("keeps the people here when nothing comes from elsewhere, as on a backend without it", async () => {
    mocks.listRemoteSuggestions.mockResolvedValue([]);
    await show();
    expect(host.querySelector('[data-testid="suggestion-haruka"]')).not.toBeNull();
    expect(elsewhere()).toBeNull();
  });

  it("shows nothing when neither has anyone, and asks nothing when signed out", async () => {
    mocks.listFollowSuggestions.mockResolvedValue([]);
    mocks.listRemoteSuggestions.mockResolvedValue([]);
    await show();
    expect(host.innerHTML).toBe("");

    mocks.auth = { authenticated: false, ready: true };
    vi.clearAllMocks();
    await show();
    expect(mocks.listRemoteSuggestions).not.toHaveBeenCalled();
  });
});
