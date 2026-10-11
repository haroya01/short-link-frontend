import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { PublishCelebration } from "./publish-celebration";
import { stampPublishCelebration } from "@/modules/blog/lib/celebrate-publish";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  sessionStorage.clear();
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

const status = () => host.querySelector('[role="status"]');

describe("the first-publish celebration", () => {
  it("tells a screen reader the post is out while the confetti stays hidden from it", async () => {
    stampPublishCelebration("night");
    await act(async () => root.render(<PublishCelebration slug="night" />));
    expect(status()!.textContent).toBe("publishedStatus");
    expect(status()!.closest("[aria-hidden]")).toBeNull();
    expect(host.querySelector("[aria-hidden]")!.textContent).toContain("publishedCelebration");

    await act(async () => vi.advanceTimersByTime(2600));
    expect(status()!.textContent).toBe("");
    expect(host.querySelector("[aria-hidden]")).toBeNull();
  });

  it("stays silent on an ordinary visit", async () => {
    await act(async () => root.render(<PublishCelebration slug="night" />));
    expect(status()!.textContent).toBe("");
  });
});
