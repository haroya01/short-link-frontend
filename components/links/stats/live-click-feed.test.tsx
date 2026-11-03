import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveClick, UseClickStreamResult } from "@/hooks/use-click-stream";


vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

import { LiveClickFeed } from "./live-click-feed";

let root: Root;
let host: HTMLDivElement;

function click(id: number, bot: boolean): LiveClick {
  return { id, occurredAt: "2026-11-02T09:00:00Z", countryCode: "KR", deviceClass: bot ? "bot" : "mobile", channel: "messaging", bot };
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function render(value: Omit<UseClickStreamResult, "bots">) {
  await act(async () => root.render(<LiveClickFeed stream={{ ...value, bots: value.items.filter((item) => item.bot).length }} />));
}

describe("LiveClickFeed on the 클릭 추이 tab", () => {
  it("draws nothing while connected and waiting: no heading, no card, no status", async () => {
    await render({ items: [], connected: true, reconnecting: false, count: 0 });
    expect(host.textContent).toBe("");
    expect(host.querySelector("section, ul, h2")).toBeNull();
    expect(host.firstElementChild!.className).toContain("grid-rows-[0fr]");
  });

  it("draws nothing while the stream is down either", async () => {
    await render({ items: [], connected: false, reconnecting: true, count: 0 });
    expect(host.textContent).toBe("");
  });

  it("opens a 지금 heading with one row per click once clicks arrive", async () => {
    await render({ items: [click(2, true), click(1, false)], connected: true, reconnecting: false, count: 2 });
    expect(host.firstElementChild!.className).toContain("grid-rows-[1fr]");
    expect(host.querySelector("h2")!.textContent).toBe("live.now");
    const rows = [...host.querySelectorAll("li")];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("South Korea · channel.messaging");
    expect(rows[0].textContent).toContain("device.bot");
    expect(rows[1].textContent).toContain("South Korea · device.mobile · channel.messaging");
    expect(rows[1].textContent).not.toContain("device.bot");
    expect(host.querySelector('[class*="border"][class*="rounded"]')).toBeNull();
  });
});
