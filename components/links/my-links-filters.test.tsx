import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { MyLinksFilters } from "@/lib/api";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { MyLinksFiltersBar } from "./my-links-filters";

const previousTz = process.env.TZ;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  process.env.TZ = "Asia/Seoul";
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
  process.env.TZ = previousTz;
});

async function render(filters: MyLinksFilters, onChange = vi.fn()) {
  await act(async () => {
    root.render(createElement(MyLinksFiltersBar, { filters, onChange, tagOptions: [] }));
  });
  return onChange;
}

it("keeps a picked start date on the same calendar day east of UTC", async () => {
  const picked = new Date("2026-09-29T00:00:00").toISOString();
  expect(picked).toBe("2026-09-28T15:00:00.000Z");
  await render({ createdAfter: picked });
  expect(container.textContent).toContain("after: 2026.09.29");

  const toggle = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("toggle"))!;
  await act(async () => toggle.click());
  const [start] = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
  expect(start.value).toBe("2026-09-29");
});
