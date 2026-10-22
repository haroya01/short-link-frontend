import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listBlogWebhooks: vi.fn(),
  registerBlogWebhook: vi.fn(),
}));
vi.mock("@/modules/blog/api/webhooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/blog/api/webhooks")>()),
  ...api,
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, authenticated: true }) }));

import BlogWebhooksPage from "./page";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("blog webhooks", () => {
  it("keeps the signing secret out of session replays", async () => {
    api.listBlogWebhooks.mockResolvedValue([]);
    api.registerBlogWebhook.mockResolvedValue({ id: 1, secret: "whsec_0123456789abcdef" });
    await act(async () => root.render(<BlogWebhooksPage />));
    const url = host.querySelector<HTMLInputElement>("#webhook-url")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(url, "https://hooks.example.com/x");
      url.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector("form")!.requestSubmit());
    const secret = Array.from(host.querySelectorAll("code")).find((c) => c.textContent === "whsec_0123456789abcdef");
    expect(secret).toBeDefined();
    expect(secret!.closest("[data-sentry-mask]")).not.toBeNull();
  });
});
