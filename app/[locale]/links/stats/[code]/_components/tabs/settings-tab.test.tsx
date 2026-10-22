import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LinkStats } from "@/types";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("@/components/auth/sign-in-link", () => ({ SignInLink: ({ children }: { children: React.ReactNode }) => createElement("a", null, children) }));
vi.mock("@/components/links/destinations-section", () => ({ LinkDestinationsSection: () => null, LinkBlockedCountriesSection: () => null }));
vi.mock("@/components/links/link-period-section", () => ({ LinkPeriodSection: () => null }));
vi.mock("@/components/links/link-protection-section", () => ({ LinkProtectionSection: () => null }));
vi.mock("@/components/links/link-visit-section", () => ({ LinkVisitSection: () => null }));
vi.mock("@/components/links/webhooks-section", () => ({ LinkWebhooksSection: () => null }));

import { SettingsTab } from "./settings-tab";

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
});

const data = { shortCode: "spr1ng", destinationClicks: [] } as unknown as LinkStats;

it.each([false, true])("keeps the click log and its exports out of link settings (demo=%s)", async (demo) => {
  await act(async () => root.render(createElement(SettingsTab, { data, onTick: () => {}, demo })));
  expect(container.textContent).not.toContain("exportEvents");
  expect(container.textContent).not.toContain("exportStats");
  expect(container.textContent).not.toContain("colTime");
});
