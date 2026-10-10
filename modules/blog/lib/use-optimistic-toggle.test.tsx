import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ authenticated: false, ready: true, signInWithGoogle: vi.fn() }));
const askToSignIn = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => (_error: unknown, fallback: string) => fallback }));

import { useOptimisticToggle } from "./use-optimistic-toggle";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  askToSignIn.mockReset();
  toast.mockReset();
  auth.authenticated = false;
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

async function failOnce(onError?: (error: unknown) => void) {
  auth.authenticated = true;
  const failure = new Error("500");
  let state = { on: false, count: 0 as number | undefined };
  function Probe() {
    const toggle = useOptimisticToggle({
      depKey: 2,
      syncKey: onError ? "like:2" : "bookmark:2",
      signInReason: "like",
      initialCount: 4,
      load: () => new Promise(() => {}),
      mutate: () => Promise.reject(failure),
      onError,
    });
    state = { on: toggle.on, count: toggle.count };
    return createElement("button", { onClick: () => void toggle.toggle() });
  }
  await act(async () => root.render(createElement(Probe)));
  await act(async () => container.querySelector("button")!.click());
  return { failure, state: () => state };
}

it("a failed toggle rolls back and says it failed", async () => {
  const { state } = await failOnce();
  expect(state()).toEqual({ on: false, count: 4 });
  expect(toast).toHaveBeenCalledWith("toggleFailed", "error");
});

it("a caller's own failure message replaces the generic one", async () => {
  const onError = vi.fn();
  const { failure, state } = await failOnce(onError);
  expect(state()).toEqual({ on: false, count: 4 });
  expect(onError).toHaveBeenCalledWith(failure);
  expect(toast).not.toHaveBeenCalled();
});
