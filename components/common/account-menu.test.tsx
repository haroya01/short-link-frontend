import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setEditorDirty } from "@/modules/blog/lib/editor-dirty-store";

const intlRouter = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/blog/write/7001",
  useRouter: () => intlRouter,
  getPathname: ({ href, locale }: { href: string; locale: string }) => `/${locale}${href}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { username: "dohyun", email: "d@kurl.me" }, signOut: vi.fn() }) }));
vi.mock("@/components/common/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/common/header-avatar-slot", () => ({ cacheMeAvatar: vi.fn(), cacheMeInitial: vi.fn(), MeAvatar: () => null }));

import { AccountMenu } from "./account-menu";

let root: Root;
let host: HTMLDivElement;
const assign = vi.fn();

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("location", { ...window.location, assign });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<AccountMenu />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="nav.account"]')!.click());
});
afterEach(async () => {
  setEditorDirty(false);
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const pickEnglish = () =>
  act(async () =>
    [...host.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]')]
      .find((b) => b.textContent === "languageSwitcher.en")!
      .click(),
  );

describe("switching the language from the account menu", () => {
  it("reloads into the other language while the editor holds unsaved work, so its leave prompt runs", async () => {
    await act(async () => setEditorDirty(true));
    await pickEnglish();
    expect(assign).toHaveBeenCalledWith("/en/blog/write/7001");
    expect(intlRouter.replace).not.toHaveBeenCalled();
  });

  it("swaps the language in place otherwise", async () => {
    await pickEnglish();
    expect(intlRouter.replace).toHaveBeenCalledWith("/blog/write/7001", { locale: "en" });
    expect(assign).not.toHaveBeenCalled();
  });
});
