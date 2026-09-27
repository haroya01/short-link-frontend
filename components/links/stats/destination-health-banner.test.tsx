import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const dialog = vi.hoisted(() => vi.fn());
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));
vi.mock("@/lib/api/links.queries", () => ({ useInvalidateLinks: () => vi.fn() }));
vi.mock("@/components/links/edit-link-dialog", () => ({
  EditLinkDialog: (props: { link: unknown }) => {
    dialog(props.link);
    return null;
  },
}));

import { DestinationHealthBanner } from "./destination-health-banner";
import type { LinkDetail } from "@/types";

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
  vi.clearAllMocks();
});

const base = {
  shortCode: "abc",
  originalUrl: "https://gone.example.com/sale",
  expiresAt: null,
  tags: ["promo"],
  note: "봄 세일",
} as unknown as LinkDetail;

it("stays out of the way while the destination is fine", async () => {
  await act(async () =>
    root.render(createElement(DestinationHealthBanner, { detail: { ...base, destinationHealth: null }, shortUrl: "kurl.me/abc" })),
  );
  expect(container.innerHTML).toBe("");
});

it("says what broke and opens the editor to fix it", async () => {
  const detail = {
    ...base,
    destinationHealth: { broken: true, failure: "NOT_FOUND", httpStatus: 404, brokenSince: null, checkedAt: "2026-09-27T00:00:00Z" },
  } as LinkDetail;
  await act(async () => root.render(createElement(DestinationHealthBanner, { detail, shortUrl: "kurl.me/abc" })));

  expect(container.textContent).toContain("missing:404");
  await act(async () => container.querySelector("button")!.click());

  expect(dialog).toHaveBeenLastCalledWith(
    expect.objectContaining({ shortCode: "abc", originalUrl: "https://gone.example.com/sale", tags: ["promo"] }),
  );
});

it("has its own words for a domain that is gone", async () => {
  const detail = {
    ...base,
    destinationHealth: { broken: true, failure: "NO_HOST", httpStatus: null, brokenSince: null, checkedAt: "2026-09-27T00:00:00Z" },
  } as LinkDetail;
  await act(async () => root.render(createElement(DestinationHealthBanner, { detail, shortUrl: "kurl.me/abc" })));

  expect(container.textContent).toContain("noHost");
});
