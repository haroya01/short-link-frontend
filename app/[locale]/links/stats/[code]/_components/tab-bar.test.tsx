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
function Probe() {
  const [active, setActive] = useState<TabKey>("overview");
  return createElement(TabBar, { active, onSelect: setActive, items: ["overview", "when", "where", "who"] });
}
it("keeps all analysis views reachable by keyboard and moves focus with the selected tab", async () => {
  await act(async () => root.render(createElement(Probe)));
  const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.map((tab) => tab.id)).toEqual(["stats-tab-overview", "stats-tab-when", "stats-tab-where", "stats-tab-who"]);
  tabs[0].focus();
  await act(async () => tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
  expect(tabs[3].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs[3]);
  expect(tabs[3].getAttribute("aria-controls")).toBe("stats-panel-who");
  expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
});
