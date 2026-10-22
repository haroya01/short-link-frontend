import React, { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TabBar } from "./tab-bar";
import type { TabKey } from "../_lib/use-tab-hash";
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
function Probe({ initial = "overview" }: { initial?: TabKey }) {
  const [active, setActive] = useState<TabKey>(initial);
  return createElement(TabBar, { active, onSelect: setActive, items: ["overview", "when", "where", "who", "log"] });
}
it("keeps all analysis views reachable by keyboard and moves focus with the selected tab", async () => {
  await act(async () => root.render(createElement(Probe)));
  const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.map((tab) => tab.id)).toEqual(["stats-tab-overview", "stats-tab-when", "stats-tab-where", "stats-tab-who", "stats-tab-log"]);
  expect(tabs[4].textContent).toBe("tabs.log");
  tabs[0].focus();
  await act(async () => tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  expect(tabs[4].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[4]);
  expect(tabs[4].getAttribute("aria-controls")).toBe("stats-panel-log");
  expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
});
it("scrolls a tab that opens past the edge of a narrow tab row into view", async () => {
  const rect = (left: number, right: number) => ({ left, right, top: 0, bottom: 40, width: right - left, height: 40, x: left, y: 0, toJSON: () => ({}) });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute("role") === "tablist") return rect(0, 343) as DOMRect;
    if (this.id === "stats-tab-log") return rect(330, 390) as DOMRect;
    return rect(0, 60) as DOMRect;
  });
  await act(async () => root.render(createElement(Probe, { initial: "log" })));
  expect(container.querySelector<HTMLElement>('[role="tablist"]')!.scrollLeft).toBe(390 - 343 + 16);
  vi.restoreAllMocks();
});
