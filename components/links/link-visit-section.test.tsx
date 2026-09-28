import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getLinkDetail: vi.fn(), setLinkVisitOptions: vi.fn() }));
const ctas = vi.hoisted(() => ({ listMyCtas: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/api/links", () => api);
vi.mock("@/lib/api/ctas", () => ctas);
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => createElement("a", { href, ...rest }, children),
}));
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
const splashSwitch = () => container.querySelectorAll<HTMLButtonElement>('[role="switch"]')[1];
const saveButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === "save")!;

function type(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  ctas.listMyCtas.mockResolvedValue([{ id: 9, label: "앱 받기", deleted: false }]);
});

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

it("saves the splash only when asked, with the chosen time and button", async () => {
  api.getLinkDetail.mockResolvedValue({ openInBrowser: false });
  api.setLinkVisitOptions.mockImplementation(async (_code: string, body: { splash: unknown }) => ({
    shortCode: "abc",
    openInBrowser: false,
    splash: body.splash,
  }));
  await act(async () => root.render(createElement(LinkVisitSection, { shortCode: "abc" })));

  await act(async () => splashSwitch().click());
  expect(api.setLinkVisitOptions).not.toHaveBeenCalled();
  await act(async () => type(container.querySelector("textarea")!, "쿠폰 SPRING20"));
  const five = [...container.querySelectorAll<HTMLButtonElement>('[role="radio"]')][3];
  await act(async () => five.click());
  const select = container.querySelector("select")!;
  await act(async () => {
    select.value = "9";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => saveButton().click());

  expect(api.setLinkVisitOptions).toHaveBeenCalledWith("abc", {
    splash: { enabled: true, message: "쿠폰 SPRING20", seconds: 5, ctaId: 9 },
  });
  expect(saveButton().disabled).toBe(true);
});

it("asks for a note before saving an empty splash", async () => {
  api.getLinkDetail.mockResolvedValue({ openInBrowser: false });
  await act(async () => root.render(createElement(LinkVisitSection, { shortCode: "abc" })));

  await act(async () => splashSwitch().click());
  await act(async () => saveButton().click());

  expect(api.setLinkVisitOptions).not.toHaveBeenCalled();
  expect(container.textContent).toContain("splashMessageRequired");
  expect(container.querySelector("textarea")!.getAttribute("aria-invalid")).toBe("true");
});
