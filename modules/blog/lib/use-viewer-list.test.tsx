import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewerList } from "./use-viewer-list";

const auth = vi.hoisted(() => ({ ready: true, me: null as { id: number } | null }));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));

let root: Root;
let host: HTMLDivElement;
let seen: string[];

async function render(load: () => Promise<string[] | null>, key = "k") {
  function Harness() {
    seen = useViewerList(["server"], load, key);
    return null;
  }
  host ??= document.createElement("div");
  root ??= createRoot(host);
  await act(async () => root.render(createElement(Harness)));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  auth.ready = true;
  auth.me = null;
});
afterEach(async () => {
  await act(async () => root.unmount());
  root = undefined as unknown as Root;
  host = undefined as unknown as HTMLDivElement;
});

describe("a server list for the signed-in reader", () => {
  it("keeps the server list for a visitor and while auth is unknown", async () => {
    const load = vi.fn(async () => ["reader"]);
    await render(load);
    expect(seen).toEqual(["server"]);
    auth.ready = false;
    auth.me = { id: 1 };
    await render(load);
    expect(seen).toEqual(["server"]);
    expect(load).not.toHaveBeenCalled();
  });

  it("swaps in the reader's list, and keeps the server's when that fetch fails", async () => {
    auth.me = { id: 1 };
    await render(async () => ["reader"]);
    expect(seen).toEqual(["reader"]);
    await render(async () => null, "other");
    expect(seen).toEqual(["server"]);
  });

  it("drops a reader's list once they sign out", async () => {
    auth.me = { id: 1 };
    await render(async () => ["reader"]);
    auth.me = null;
    await render(async () => ["reader"]);
    expect(seen).toEqual(["server"]);
  });
});
