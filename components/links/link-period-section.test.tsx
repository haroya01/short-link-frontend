import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getLinkDetail: vi.fn(), setLinkVisitOptions: vi.fn(), updateLink: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/api/links", () => api);
vi.mock("@/lib/api/links.queries", () => ({ useInvalidateLinks: () => () => Promise.resolve() }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => (_e: unknown, fallback: string) => fallback }));

import { LinkPeriodSection } from "./link-period-section";

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

const switches = () => container.querySelectorAll<HTMLButtonElement>('[role="switch"]');
const saveButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === "save")!;
const dateInputs = () => container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');

async function setValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("schedules an opening time and clears it again", async () => {
  api.getLinkDetail.mockResolvedValue({ opensAt: null, expiresAt: null, expiredMessage: null });
  api.setLinkVisitOptions.mockImplementation(async (_code: string, body: { opensAt?: string }) => ({
    shortCode: "abc",
    openInBrowser: false,
    opensAt: body.opensAt ?? null,
  }));
  await act(async () => root.render(createElement(LinkPeriodSection, { shortCode: "abc" })));

  await act(async () => switches()[0].click());
  const future = "2099-05-01T10:30";
  await setValue(dateInputs()[0], future);
  await act(async () => saveButton().click());
  expect(api.setLinkVisitOptions).toHaveBeenLastCalledWith("abc", { opensAt: new Date(future).toISOString() });
  expect(api.updateLink).not.toHaveBeenCalled();

  await act(async () => switches()[0].click());
  await act(async () => saveButton().click());
  expect(api.setLinkVisitOptions).toHaveBeenLastCalledWith("abc", { clearOpensAt: true });
});

it("refuses an opening time in the past", async () => {
  api.getLinkDetail.mockResolvedValue({ opensAt: null, expiresAt: null, expiredMessage: null });
  await act(async () => root.render(createElement(LinkPeriodSection, { shortCode: "abc" })));

  await act(async () => switches()[0].click());
  await setValue(dateInputs()[0], "2001-01-01T09:00");
  await act(async () => saveButton().click());

  expect(api.setLinkVisitOptions).not.toHaveBeenCalled();
  expect(container.textContent).toContain("scheduleInPast");
});

it("sets an expiry with its closing message in one save, and clears it", async () => {
  api.getLinkDetail.mockResolvedValue({ opensAt: null, expiresAt: null, expiredMessage: null });
  api.updateLink.mockImplementation(async (_code: string, body: { expiresAt?: string | null }) => ({
    shortCode: "abc",
    expiresAt: body.expiresAt ?? null,
  }));
  await act(async () => root.render(createElement(LinkPeriodSection, { shortCode: "abc" })));

  await act(async () => switches()[1].click());
  const closes = "2099-06-01T18:00";
  await setValue(dateInputs()[0], closes);
  await act(async () => {
    const textarea = container.querySelector("textarea")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(textarea, "행사가 끝났어요");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => saveButton().click());
  expect(api.updateLink).toHaveBeenLastCalledWith("abc", {
    expiresAt: new Date(closes).toISOString(),
    expiredMessage: "행사가 끝났어요",
  });
  expect(api.setLinkVisitOptions).not.toHaveBeenCalled();

  await act(async () => switches()[1].click());
  await act(async () => saveButton().click());
  expect(api.updateLink).toHaveBeenLastCalledWith("abc", { expiresAt: null, clearExpiresAt: true, expiredMessage: undefined });
});

it("refuses an expiry that comes before the opening time", async () => {
  api.getLinkDetail.mockResolvedValue({ opensAt: null, expiresAt: null, expiredMessage: null });
  await act(async () => root.render(createElement(LinkPeriodSection, { shortCode: "abc" })));

  await act(async () => switches()[0].click());
  await setValue(dateInputs()[0], "2099-05-01T10:30");
  await act(async () => switches()[1].click());
  await setValue(dateInputs()[1], "2099-04-01T10:30");
  await act(async () => saveButton().click());

  expect(api.setLinkVisitOptions).not.toHaveBeenCalled();
  expect(api.updateLink).not.toHaveBeenCalled();
  expect(container.textContent).toContain("expiryBeforeOpen");
});
