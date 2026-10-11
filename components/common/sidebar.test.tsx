import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = { open: false, toggle: vi.fn(), close: vi.fn() };

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  usePathname: () => "/blog/write",
}));
vi.mock("@/hooks/use-focus-trap", () => ({ useFocusTrap: () => undefined }));
vi.mock("@/components/common/sidebar-state", () => ({ useSidebarState: () => state }));

import { MobileSidebar } from "./sidebar";

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

const drawer = () => host.querySelector<HTMLElement>('[role="dialog"]')!;

describe("the phone drawer", () => {
  it("casts its shadow only while it is out, so a closed drawer leaves no smudge on the page edge", async () => {
    state.open = false;
    await act(async () => root.render(<MobileSidebar sections={[]} />));
    expect(drawer().classList).toContain("-translate-x-full");
    expect(drawer().classList).not.toContain("shadow-modal");

    state.open = true;
    await act(async () => root.render(<MobileSidebar sections={[]} />));
    expect(drawer().classList).toContain("shadow-modal");
  });
});
