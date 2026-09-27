import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getLinkDetail: vi.fn(), setLinkVisitOptions: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/api/links", () => api);
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => (_e: unknown, fallback: string) => fallback }));

import { LinkVisitSection } from "./link-visit-section";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const toggle = () => container.querySelector<HTMLButtonElement>('[role="switch"]')!;

it("saves the switch and keeps what the server answered", async () => {
  api.getLinkDetail.mockResolvedValue({ openInBrowser: false });
  api.setLinkVisitOptions.mockResolvedValue({ shortCode: "abc", openInBrowser: true });
  await act(async () => root.render(createElement(LinkVisitSection, { shortCode: "abc" })));
  expect(toggle().getAttribute("aria-checked")).toBe("false");

  await act(async () => toggle().click());

  expect(api.setLinkVisitOptions).toHaveBeenCalledWith("abc", { openInBrowser: true });
  expect(toggle().getAttribute("aria-checked")).toBe("true");
});

it("rolls back and says so when saving fails", async () => {
  api.getLinkDetail.mockResolvedValue({ openInBrowser: true });
  api.setLinkVisitOptions.mockRejectedValue(new Error("boom"));
  await act(async () => root.render(createElement(LinkVisitSection, { shortCode: "abc" })));

  await act(async () => toggle().click());

  expect(toggle().getAttribute("aria-checked")).toBe("true");
  expect(toast).toHaveBeenCalledWith("failed", "error");
});

it("stays disabled when the current value could not be loaded", async () => {
  api.getLinkDetail.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(createElement(LinkVisitSection, { shortCode: "abc" })));

  expect(toggle().disabled).toBe(true);
  expect(container.textContent).toContain("loadFailed");
});
