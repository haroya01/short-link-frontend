import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const askToSignIn = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn }));

import { SignInRow } from "./sign-in-row";

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

it("stands in for the composer and asks to sign in, coming back to where it was asked", async () => {
  await act(async () =>
    root.render(<SignInRow reason="reply" placeholder="답글 남기기..." next={() => "https://kurl.me/p?highlightId=41&thread=1"} />),
  );
  const row = container.querySelector("button")!;
  expect(row.getAttribute("aria-label")).toBe("reply");
  expect(container.querySelector("textarea, [contenteditable]")).toBeNull();
  await act(async () => row.click());
  expect(askToSignIn).toHaveBeenCalledWith("reply", "https://kurl.me/p?highlightId=41&thread=1");
});
