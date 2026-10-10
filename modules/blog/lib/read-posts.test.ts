import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "kurl:read-posts";

async function fresh() {
  vi.resetModules();
  return import("./read-posts");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("read posts store", () => {
  it("remembers a finished post across module loads", async () => {
    const first = await fresh();
    expect(first.readPosts().has(7)).toBe(false);
    first.markPostRead(7);
    expect(first.readPosts().has(7)).toBe(true);

    const second = await fresh();
    expect(second.readPosts().has(7)).toBe(true);
  });

  it("keeps the newest 600 and drops the oldest", async () => {
    const store = await fresh();
    for (let id = 1; id <= 601; id++) store.markPostRead(id);
    expect(store.readPosts().has(1)).toBe(false);
    expect(store.readPosts().has(2)).toBe(true);
    expect(store.readPosts().has(601)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "[]")).toHaveLength(600);
  });

  it("does not grow on a repeat read", async () => {
    const store = await fresh();
    store.markPostRead(3);
    store.markPostRead(3);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "[]")).toEqual([3]);
  });

  it("ignores a corrupt entry instead of throwing", async () => {
    window.localStorage.setItem(KEY, '{"not":"a list"}');
    const store = await fresh();
    expect(store.readPosts().size).toBe(0);
    store.markPostRead(9);
    expect(store.readPosts().has(9)).toBe(true);
  });

  it("re-renders a row when the post is read here or in another tab", async () => {
    const store = await fresh();
    const { act, createElement } = await import("react");
    const { createRoot } = await import("react-dom/client");
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const host = document.createElement("div");
    const root = createRoot(host);
    function Probe({ id }: { id: number }) {
      return createElement("span", null, store.useIsPostRead(id) ? "read" : "unread");
    }
    await act(async () => root.render(createElement("div", null, createElement(Probe, { id: 11 }), createElement(Probe, { id: 12 }))));
    expect(host.textContent).toBe("unreadunread");

    await act(async () => store.markPostRead(11));
    expect(host.textContent).toBe("readunread");

    window.localStorage.setItem(KEY, "[11,12]");
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(host.textContent).toBe("readread");
    await act(async () => root.unmount());
  });
});
