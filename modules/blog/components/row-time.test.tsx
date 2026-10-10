import React, { act, createElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RowTime } from "./row-time";

const ISO = "2026-10-10T09:00:00Z";

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:30:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("RowTime", () => {
  it("serves the absolute date from the server so a cached page never shows a stale '30분'", () => {
    const html = renderToString(createElement(RowTime, { iso: ISO, locale: "ko" }));
    expect(html).toContain("10월 10일");
    expect(html).toContain(`dateTime="${ISO}"`);
  });

  it("hydrates without a mismatch and then switches to the relative time", async () => {
    const host = document.createElement("div");
    host.innerHTML = renderToString(createElement(RowTime, { iso: ISO, locale: "ko" }));
    document.body.append(host);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(host, createElement(RowTime, { iso: ISO, locale: "ko" }));
    });
    expect(errors).not.toHaveBeenCalled();
    expect(host.textContent).toBe("30분");
    await act(async () => root!.unmount());
    errors.mockRestore();
  });

  it("renders the relative time straight away in a client-only list", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => root.render(createElement(RowTime, { iso: ISO, locale: "ja" })));
    expect(host.textContent).toBe("30分");
    await act(async () => root.unmount());
  });
});
