import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockedUser } from "@/modules/blog/api/follows";

const api = vi.hoisted(() => ({
  listBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));
const auth = vi.hoisted(() => ({ authenticated: true, me: { id: 1, username: "dohyun" } as { id: number; username: string } | null }));
vi.mock("@/modules/blog/api/follows", () => api);
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));

type Store = typeof import("./user-blocks");
let store: Store;
let root: Root;
let host: HTMLDivElement;
let names: ReadonlySet<string>;

const user = (username: string, id = 1): BlockedUser => ({ id, username, avatarUrl: null });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function mount() {
  function Harness() {
    names = store.useBlockedNames();
    return null;
  }
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(Harness)); });
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  auth.authenticated = true;
  auth.me = { id: 1, username: "dohyun" };
  api.listBlockedUsers.mockResolvedValue([user("mallory")]);
  api.blockUser.mockResolvedValue(undefined);
  api.unblockUser.mockResolvedValue(undefined);
  store = await import("./user-blocks");
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  vi.unstubAllGlobals();
});

describe("the viewer's blocked accounts", () => {
  it("loads once for a signed-in viewer and stays empty for a visitor", async () => {
    await mount();
    expect([...names]).toEqual(["mallory"]);
    await act(async () => { root.render(createElement(() => { names = store.useBlockedNames(); return null; })); });
    expect(api.listBlockedUsers).toHaveBeenCalledOnce();

    await act(async () => { root.unmount(); });
    auth.authenticated = false;
    auth.me = null;
    await mount();
    expect(names.size).toBe(0);
  });

  it("hides an author the moment they are blocked and says follows changed", async () => {
    await mount();
    const followChanged = vi.fn();
    window.addEventListener("kurl:follow-changed", followChanged);
    const sent = deferred<void>();
    api.blockUser.mockReturnValueOnce(sent.promise);
    api.listBlockedUsers.mockResolvedValue([user("yuna", 15), user("mallory")]);

    let blocking!: Promise<void>;
    await act(async () => { blocking = store.blockAuthor("yuna"); });
    expect(names.has("yuna")).toBe(true);
    await act(async () => { sent.resolve(); await blocking; });

    expect(api.blockUser).toHaveBeenCalledWith("yuna");
    expect(followChanged).toHaveBeenCalledOnce();
    expect([...names]).toEqual(["yuna", "mallory"]);
    window.removeEventListener("kurl:follow-changed", followChanged);
  });

  it("shows the author again when the block fails", async () => {
    await mount();
    api.blockUser.mockRejectedValueOnce(new Error("offline"));
    await act(async () => { await expect(store.blockAuthor("yuna")).rejects.toThrow("offline"); });
    expect(names.has("yuna")).toBe(false);
  });

  it("keeps a block made while the first list was still loading", async () => {
    const first = deferred<BlockedUser[]>();
    api.listBlockedUsers.mockReturnValueOnce(first.promise).mockResolvedValue([user("yuna", 15)]);
    await mount();
    await act(async () => { await store.blockAuthor("yuna"); });
    await act(async () => { first.resolve([user("mallory")]); });
    expect(names.has("yuna")).toBe(true);
  });

  it("unblocks at once and restores the block if the server refuses", async () => {
    await mount();
    await act(async () => { await store.unblockAuthor("mallory"); });
    expect(api.unblockUser).toHaveBeenCalledWith("mallory");
    expect(names.has("mallory")).toBe(false);

    await act(async () => { await store.blockAuthor("mallory"); });
    api.unblockUser.mockRejectedValueOnce(new Error("offline"));
    await act(async () => { await expect(store.unblockAuthor("mallory")).rejects.toThrow("offline"); });
    expect(names.has("mallory")).toBe(true);
  });
});

describe("a server-rendered card by a blocked author", () => {
  it("drops out on block and returns on unblock", async () => {
    const { HideIfBlocked } = await import("@/modules/blog/components/hide-if-blocked");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(
        <HideIfBlocked username="yuna">
          <li>yuna&apos;s post</li>
        </HideIfBlocked>,
      );
    });
    expect(host.textContent).toBe("yuna's post");
    api.listBlockedUsers.mockResolvedValue([user("yuna", 15), user("mallory")]);
    await act(async () => { await store.blockAuthor("yuna"); });
    expect(host.textContent).toBe("");
    await act(async () => { await store.unblockAuthor("yuna"); });
    expect(host.textContent).toBe("yuna's post");
  });
});
