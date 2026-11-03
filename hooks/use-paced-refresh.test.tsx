import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePacedRefresh } from "./use-paced-refresh";

let root: Root;
let host: HTMLDivElement;
let visibility: DocumentVisibilityState = "visible";
const refresh = vi.fn();
let markStale: () => void = () => {};

function Probe({ last }: { last: number }) {
  markStale = usePacedRefresh(refresh, last, 60_000);
  return null;
}

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  visibility = "visible";
  refresh.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("live clicks pace the full stats report", () => {
  it("folds a burst of clicks into one refresh at least a minute after the last fetch", async () => {
    await act(async () => root.render(<Probe last={Date.now()} />));
    for (let i = 0; i < 20; i++) markStale();
    await act(async () => vi.advanceTimersByTime(59_000));
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes at once when the last fetch is already a minute old", async () => {
    await act(async () => root.render(<Probe last={Date.now() - 61_000} />));
    markStale();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops while the tab is hidden and catches up when it comes back", async () => {
    await act(async () => root.render(<Probe last={Date.now()} />));
    markStale();
    setVisibility("hidden");
    await act(async () => vi.advanceTimersByTime(5 * 60_000));
    expect(refresh).not.toHaveBeenCalled();
    setVisibility("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does nothing on its own when no click came in", async () => {
    await act(async () => root.render(<Probe last={Date.now() - 120_000} />));
    setVisibility("hidden");
    setVisibility("visible");
    await act(async () => vi.advanceTimersByTime(120_000));
    expect(refresh).not.toHaveBeenCalled();
  });
});
