import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) =>
    Object.assign((key: string) => `${namespace}.${key}`, { has: (code: string) => code === "POST_INTERACTION_BLOCKED" }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));

import { ApiError } from "@/lib/api/client";
import { useLikeFailed } from "./use-like-failed";

let root: Root;
let container: HTMLDivElement;
let likeFailed: (error: unknown) => void = () => {};
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  toast.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function mount() {
  function Probe() {
    likeFailed = useLikeFailed();
    return null;
  }
  await act(async () => root.render(createElement(Probe)));
}

it("says the like didn't go through when the reason is unknown", async () => {
  await mount();
  likeFailed(new Error("Failed to fetch"));
  expect(toast).toHaveBeenCalledWith("errors.likeFailed", "error");
});

it("gives the server's reason when it has one", async () => {
  await mount();
  likeFailed(new ApiError(403, { status: 403, code: "POST_INTERACTION_BLOCKED" }));
  expect(toast).toHaveBeenCalledWith("errors.POST_INTERACTION_BLOCKED", "error");
});
