import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarChart3 } from "lucide-react";

const auth = vi.hoisted(() => ({ authenticated: false, signInWithGoogle: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) =>
    Object.assign((key: string) => `${ns}.${key}`, { rich: (key: string) => `${ns}.${key}` }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/components/auth/apple-sign-in-button", () => ({ AppleSignInButton: () => null }));

import { askToSignIn, LoginPromptHost } from "./login-prompt";
import { SignInEmptyState } from "./sign-in-empty-state";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", (media: string) => ({ matches: false, media, addEventListener() {}, removeEventListener() {} }));
  auth.authenticated = false;
  auth.signInWithGoogle.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const sheet = () => document.querySelector<HTMLElement>('[role="dialog"]');
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 300)));

async function ask(reason: Parameters<typeof askToSignIn>[0]) {
  await act(async () => askToSignIn(reason));
}

describe("the one sign-in sheet", () => {
  it("says why in one line and offers Google, nothing else", async () => {
    await act(async () => root.render(createElement(LoginPromptHost)));
    await ask("like");

    const dialog = sheet()!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.querySelector("h2")?.textContent).toBe("loginPrompt.like");
    expect(dialog.querySelectorAll("h2, p")).toHaveLength(2);
    const google = [...dialog.querySelectorAll("button")].find((b) => b.textContent === "loginPrompt.google")!;
    await act(async () => google.click());
    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and on its close button", async () => {
    await act(async () => root.render(createElement(LoginPromptHost)));
    await ask("comment");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await settle();
    expect(sheet()).toBeNull();

    await ask("comment");
    const close = sheet()!.querySelector<HTMLButtonElement>('button[aria-label="common.close"]')!;
    await act(async () => close.click());
    await settle();
    expect(sheet()).toBeNull();
  });

  it("never shows to someone already signed in", async () => {
    auth.authenticated = true;
    await act(async () => root.render(createElement(LoginPromptHost)));
    await ask("follow");
    expect(sheet()).toBeNull();
  });

  it("a sign-in-only page shows one line and a button that opens the sheet with the same line", async () => {
    await act(async () =>
      root.render(
        createElement("div", null, createElement(SignInEmptyState, { page: true, reason: "stats", icon: BarChart3 }), createElement(LoginPromptHost)),
      ),
    );
    const empty = container.querySelector('[data-testid="sign-in-empty"]')!;
    expect(empty.querySelector("h1")?.textContent).toBe("loginPrompt.stats");
    expect(empty.querySelectorAll("button")).toHaveLength(1);
    expect(empty.querySelectorAll("a")).toHaveLength(0);

    await act(async () => empty.querySelector("button")!.click());
    expect(sheet()?.querySelector("h2")?.textContent).toBe("loginPrompt.stats");
    expect(auth.signInWithGoogle).not.toHaveBeenCalled();
  });
});
