import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ authenticated: false, ready: true, signInWithGoogle: vi.fn() }));
const askToSignIn = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => () => "" }));

import { useOptimisticToggle } from "./use-optimistic-toggle";

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

it("a signed-out tap asks to sign in for that action instead of leaving for Google", async () => {
  const mutate = vi.fn();
  function Probe() {
    const { toggle } = useOptimisticToggle({
      depKey: 1,
      syncKey: "like:1",
      signInReason: "like",
      load: vi.fn(),
      mutate,
    });
    return createElement("button", { onClick: () => void toggle() });
  }
  await act(async () => root.render(createElement(Probe)));
  await act(async () => container.querySelector("button")!.click());

  expect(askToSignIn).toHaveBeenCalledWith("like");
  expect(auth.signInWithGoogle).not.toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
});
