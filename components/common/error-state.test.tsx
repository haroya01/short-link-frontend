import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

import { ErrorState } from "./error-state";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
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

describe("ErrorState", () => {
  it("says one fact and offers a text retry, with no icon or tinted box", async () => {
    const onRetry = vi.fn();
    await act(async () => root.render(<ErrorState message="목록을 불러오지 못했어요" onRetry={onRetry} />));
    const state = host.querySelector('[data-testid="error-state"]')!;
    expect(state.querySelectorAll("p")).toHaveLength(1);
    expect(state.querySelector("p")!.textContent).toBe("목록을 불러오지 못했어요");
    expect(state.querySelector("svg")).toBeNull();
    expect(state.className).not.toMatch(/text-center|items-center|bg-red|border/);
    const retry = state.querySelector("button")!;
    expect(retry.textContent).toBe("common.retry");
    await act(async () => retry.click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("falls back to the shared line when the caller names nothing", async () => {
    await act(async () => root.render(<ErrorState />));
    expect(host.textContent).toBe("common.errorTitle");
    expect(host.querySelector("button")).toBeNull();
  });

  it("prefers the caller's title over the raw message", async () => {
    await act(async () => root.render(<ErrorState title="검색하지 못했어요" message="HTTP 503" />));
    expect(host.querySelector("p")!.textContent).toBe("검색하지 못했어요");
  });
});
