import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { Note, RemoteAccount } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, ready: true },
  askToSignIn: vi.fn(),
  resolveRemote: vi.fn(),
  setRemoteFollow: vi.fn(),
  getRemoteAccount: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    values?.domain ? `${namespace}.${key}:${values.domain}` : `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: mocks.askToSignIn }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/modules/notes/api/federation-search", async (original) => ({
  ...(await original<typeof import("@/modules/notes/api/federation-search")>()),
  resolveRemote: mocks.resolveRemote,
}));
vi.mock("@/modules/notes/api/notes", () => ({
  getRemoteAccount: mocks.getRemoteAccount,
  listDomainBlocks: vi.fn(),
  listRemoteAccountNotes: vi.fn(),
  listRemoteFollowing: vi.fn(),
  lookupRemoteAccount: vi.fn(),
  setDomainBlocked: vi.fn(),
  setRemoteFollow: mocks.setRemoteFollow,
}));
vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("./note-card", () => ({
  NoteCard: ({ note }: { note: Note }) => createElement("article", { "data-note-id": note.id }, note.body),
}));
vi.mock("./note-list", () => ({ NoteList: () => null }));

import { RemotePeople, RemoteSearchFallback, RemoteSearchResult } from "./remote-search";
import { RemoteAccountScreen } from "./remote-account";

const mina: RemoteAccount = {
  id: 9800,
  acct: "mina@mastodon.social",
  username: "mina",
  domain: "mastodon.social",
  displayName: "Mina",
  avatarUrl: null,
  url: "https://mastodon.social/@mina",
  following: false,
  requested: false,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { authenticated: true, ready: true };
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(<QueryClientProvider client={client}>{element}</QueryClientProvider>));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === label);

describe("a handle or an address in search", () => {
  it("asks a signed-out reader to sign in without asking the server", async () => {
    mocks.auth = { authenticated: false, ready: true };
    await show(<RemoteSearchResult query="@mina@mastodon.social" />);
    expect(host.textContent).toContain("notes.remoteSearchSignIn");
    await act(async () => button("loginPrompt.signIn")!.click());
    expect(mocks.askToSignIn).toHaveBeenCalledWith("remote");
    expect(mocks.resolveRemote).not.toHaveBeenCalled();
  });

  it("says it is asking while the server has not answered", async () => {
    mocks.resolveRemote.mockReturnValue(new Promise(() => {}));
    await show(<RemoteSearchResult query="@mina@mastodon.social" />);
    expect(host.textContent).toContain("notes.remoteLookingUp");
  });

  it("shows the account with its server and a way to its page", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "account", account: mina });
    await show(<RemoteSearchResult query="@mina@mastodon.social" />);
    const section = host.querySelector('[data-testid="remote-search-result"]')!;
    expect(section.textContent).toContain("notes.remoteSection");
    expect(section.textContent).toContain("@mina@mastodon.social");
    expect(section.querySelector("a")!.getAttribute("href")).toMatch(/\/remote\/9800$/);
  });

  it("shows the note an address points at", async () => {
    mocks.resolveRemote.mockResolvedValue({
      state: "note",
      note: { id: 12, body: "Hello from the fediverse", author: { remoteId: 9800 } } as unknown as Note,
    });
    await show(<RemoteSearchResult query="https://mastodon.social/@mina/12" />);
    expect(host.querySelector('article[data-note-id="12"]')!.textContent).toBe("Hello from the fediverse");
  });

  it("names the server that has no such account", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "missing", domain: "mastodon.social" });
    await show(<RemoteSearchResult query="@nobody@mastodon.social" />);
    expect(host.textContent).toContain("notes.remoteSearchNotFound:mastodon.social");
  });

  it("names the server that did not answer", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "unreachable", domain: "down.example" });
    await show(<RemoteSearchResult query="@mina@down.example" />);
    expect(host.textContent).toContain("notes.remoteSearchUnreachable:down.example");
  });

  it("leaves nothing behind when the backend cannot resolve yet", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "hidden" });
    await show(<RemoteSearchResult query="https://mastodon.social/@mina/12" />);
    expect(host.querySelector('[data-testid="remote-search-result"]')).toBeNull();
    expect(host.textContent).toBe("");
  });
});

describe("the post search under a handle or an address", () => {
  const posts = (
    <RemoteSearchFallback query="@mina@mastodon.social">
      <p data-testid="posts">posts</p>
    </RemoteSearchFallback>
  );

  it.each([
    ["while the server is asked", new Promise(() => {})],
    ["once the account is found", Promise.resolve({ state: "account", account: mina })],
    ["when the server has no such account", Promise.resolve({ state: "missing", domain: "mastodon.social" })],
    ["when the server did not answer", Promise.resolve({ state: "unreachable", domain: "mastodon.social" })],
  ])("stays out of the way %s", async (_, answer) => {
    mocks.resolveRemote.mockReturnValue(answer);
    await show(posts);
    expect(host.querySelector('[data-testid="posts"]')).toBeNull();
  });

  it("stays out of the way for a signed-out reader", async () => {
    mocks.auth = { authenticated: false, ready: true };
    await show(posts);
    expect(host.querySelector('[data-testid="posts"]')).toBeNull();
  });

  it("comes back when the backend cannot resolve, so the page is never blank", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "hidden" });
    await show(
      <>
        <RemoteSearchResult query="@mina@mastodon.social" />
        {posts}
      </>,
    );
    expect(host.querySelector('[data-testid="posts"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="remote-search-result"]')).toBeNull();
    expect(mocks.resolveRemote).toHaveBeenCalledTimes(1);
  });
});

describe("people on other servers under a name search", () => {
  it("lists each account with its server", async () => {
    await show(<RemotePeople accounts={[mina, { ...mina, id: 9801, acct: "haruto@misskey.io", username: "haruto", displayName: null }]} />);
    const rows = Array.from(host.querySelectorAll('[data-testid="remote-people-results"] li'));
    expect(rows.map((row) => row.querySelector("a")!.textContent)).toEqual([
      "MMina@mina@mastodon.social",
      "Hharuto@haruto@misskey.io",
    ]);
    expect(host.textContent).toContain("notes.remoteSection");
    expect(host.textContent).not.toContain("notes.remoteSearchHint");
  });

  it("says how to find someone elsewhere when no account matched", async () => {
    await show(<RemotePeople accounts={[]} />);
    expect(host.textContent).toBe("notes.remoteSearchHint");
  });

  it("asks a signed-out reader to sign in before following", async () => {
    mocks.auth = { authenticated: false, ready: true };
    await show(<RemotePeople accounts={[mina]} />);
    await act(async () => button("notes.remoteFollow")!.click());
    expect(mocks.askToSignIn).toHaveBeenCalledWith("follow");
    expect(mocks.setRemoteFollow).not.toHaveBeenCalled();
  });

  it("sends a follow request for a signed-in reader", async () => {
    mocks.setRemoteFollow.mockResolvedValue({ ...mina, requested: true });
    await show(<RemotePeople accounts={[mina]} />);
    await act(async () => button("notes.remoteFollow")!.click());
    expect(mocks.setRemoteFollow).toHaveBeenCalledWith(9800, true);
    expect(button("notes.remoteRequested")).toBeDefined();
  });
});

describe("an account page on another server", () => {
  it("asks a signed-out reader to sign in instead of saying the account is gone", async () => {
    mocks.getRemoteAccount.mockRejectedValue(new ApiError(401, { status: 401 }));
    await show(<RemoteAccountScreen id={9800} />);
    expect(host.textContent).toContain("loginPrompt.remoteAccount");
    expect(host.textContent).not.toContain("notes.remoteNotFound");
  });

  it("still says the account is gone when the server does not know it", async () => {
    mocks.getRemoteAccount.mockRejectedValue(new ApiError(404, { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" }));
    await show(<RemoteAccountScreen id={9800} />);
    expect(host.textContent).toContain("notes.remoteNotFound");
  });
});
