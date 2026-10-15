import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const askToSignIn = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({ useLocale: () => "ko" }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }),
}));
vi.mock("@/lib/host", () => ({ linksHref: (path: string) => `https://kurl.me${path}` }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn }));

import { SignInLink } from "./sign-in-link";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  askToSignIn.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderLink() {
  await act(async () =>
    root.render(
      <SignInLink reason="campaigns" next="/campaigns/new">
        QR 만들기
      </SignInLink>,
    ),
  );
  return container.querySelector("a")!;
}

it("keeps the login page as its address but opens the sheet on a plain click", async () => {
  const link = await renderLink();
  expect(link.getAttribute("href")).toBe("/login?next=/campaigns/new");
  const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  await act(async () => link.dispatchEvent(click));
  expect(click.defaultPrevented).toBe(true);
  expect(askToSignIn).toHaveBeenCalledWith("campaigns", "https://kurl.me/ko/campaigns/new");
});

it("leaves a modified click to the browser", async () => {
  const link = await renderLink();
  let preventedByLink: boolean | null = null;
  const settle = (e: Event) => {
    preventedByLink = e.defaultPrevented;
    e.preventDefault();
  };
  document.addEventListener("click", settle);
  const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true });
  await act(async () => link.dispatchEvent(click));
  document.removeEventListener("click", settle);
  expect(preventedByLink).toBe(false);
  expect(askToSignIn).not.toHaveBeenCalled();
});
