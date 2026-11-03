import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const live = vi.hoisted(() => ({
  scope: { pause: vi.fn(), resume: vi.fn(), stop: vi.fn() },
  open: vi.fn(),
}));

vi.mock("@/lib/live-scope", () => ({ openLiveScope: live.open }));

import { useLiveScope } from "./use-live-scope";

describe("useLiveScope", () => {
  let root: Root;
  let visibility: DocumentVisibilityState;

  function Probe({ enabled, since }: { enabled: boolean; since: string }) {
    useLiveScope("note", 9, { enabled, since, known: () => false, refresh: async () => undefined });
    return null;
  }

  const render = (enabled: boolean, since = "12") => act(async () => root.render(createElement(Probe, { enabled, since })));
  const turn = (next: DocumentVisibilityState) =>
    act(async () => {
      visibility = next;
      document.dispatchEvent(new Event("visibilitychange"));
    });

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    live.open.mockReset().mockReturnValue(live.scope);
    Object.values(live.scope).forEach((fn) => fn.mockReset());
    root = createRoot(document.createElement("div"));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  });

  it("stays shut until the screen has its list, then opens once from that list's newest id", async () => {
    await render(false);
    expect(live.open).not.toHaveBeenCalled();
    await render(true, "12");
    await render(true, "13");
    expect(live.open).toHaveBeenCalledTimes(1);
    expect(live.open.mock.calls[0][0]).toMatchObject({ kind: "note", id: 9, since: "12", paused: false });
  });

  it("closes while the tab is hidden, reopens when it shows, and stops when the screen goes away", async () => {
    await render(true);
    await turn("hidden");
    expect(live.scope.pause).toHaveBeenCalledTimes(1);
    await turn("visible");
    expect(live.scope.resume).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    expect(live.scope.stop).toHaveBeenCalledTimes(1);
    root = createRoot(document.createElement("div"));
  });

  it("starts paused when the tab is already hidden", async () => {
    visibility = "hidden";
    await render(true);
    expect(live.open.mock.calls[0][0]).toMatchObject({ paused: true });
  });
});
