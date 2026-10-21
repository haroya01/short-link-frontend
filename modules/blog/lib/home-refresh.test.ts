import { afterEach, describe, expect, it, vi } from "vitest";
import { onHomeRefresh, requestHomeRefresh } from "./home-refresh";

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => vi.useRealTimers());

describe("when 홈 refreshes", () => {
  it("refreshes when 홈 is pressed on 홈", () => {
    const refresh = vi.fn();
    const off = onHomeRefresh(refresh);
    requestHomeRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);
    off();
    requestHomeRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes on coming back to the tab after a minute away, not after a glance", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const off = onHomeRefresh(refresh);
    setVisibility("hidden");
    vi.advanceTimersByTime(30_000);
    setVisibility("visible");
    expect(refresh).not.toHaveBeenCalled();
    setVisibility("hidden");
    vi.advanceTimersByTime(60_000);
    setVisibility("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
    off();
  });
});
