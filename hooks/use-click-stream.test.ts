import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClickStream, type UseClickStreamResult } from "./use-click-stream";

vi.mock("@/lib/api", () => ({ readToken: () => null, withBase: (path: string) => path, request: vi.fn() }));

class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = [];
  close = vi.fn();
  onerror: (() => void) | null = null;
  constructor(public url: string) { super(); FakeEventSource.instances.push(this); }
  click() {
    this.dispatchEvent(new MessageEvent("click", { data: JSON.stringify({ occurredAt: "2026-09-06T00:00:00Z", countryCode: "KR", deviceClass: "mobile", channel: "direct", bot: false }) }));
  }
}

describe("useClickStream link changes", () => {
  let root: Root;
  let container: HTMLDivElement;
  let result: UseClickStreamResult;
  const onTick = vi.fn();
  function Probe({ code }: { code: string }) {
    result = useClickStream(code, { claimToken: "claim", onTick });
    return null;
  }

  beforeEach(() => {
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    FakeEventSource.instances = [];
    onTick.mockReset();
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  });

  it("clears the prior link and ignores its late events after navigation", async () => {
    await act(async () => root.render(createElement(Probe, { code: "first" })));
    const first = FakeEventSource.instances[0];
    await act(async () => { first.dispatchEvent(new Event("ready")); first.click(); });
    expect(result!.count).toBe(1);
    expect(result!.connected).toBe(true);

    await act(async () => root.render(createElement(Probe, { code: "second" })));
    expect(first.close).toHaveBeenCalled();
    expect(result!).toMatchObject({ items: [], count: 0, connected: false });
    await act(async () => { first.dispatchEvent(new Event("ready")); first.click(); });
    expect(result!).toMatchObject({ items: [], count: 0, connected: false });
    expect(onTick).toHaveBeenCalledTimes(1);

    await act(async () => FakeEventSource.instances[1].click());
    expect(result!.items).toHaveLength(1);
    expect(result!.count).toBe(1);
  });
  it("distinguishes reconnection from the first connection and clears it when ready", async () => {
    await act(async () => root.render(createElement(Probe, { code: "first" })));
    const stream = FakeEventSource.instances[0];
    expect(result!.reconnecting).toBe(false);
    await act(async () => { stream.dispatchEvent(new Event("ready")); });
    await act(async () => { stream.onerror?.(); });
    expect(result!).toMatchObject({ connected: false, reconnecting: true });
    await act(async () => { stream.dispatchEvent(new Event("ready")); });
    expect(result!).toMatchObject({ connected: true, reconnecting: false });
  });

});
