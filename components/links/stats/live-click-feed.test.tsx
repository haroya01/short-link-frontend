import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveClick, UseClickStreamResult } from "@/hooks/use-click-stream";

const stream = vi.hoisted(() => ({ value: { items: [], connected: false, reconnecting: false, count: 0 } as UseClickStreamResult }));
const calls = vi.hoisted(() => [] as unknown[][]);

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/hooks/use-click-stream", () => ({
  useClickStream: (...args: unknown[]) => {
    calls.push(args);
    return stream.value;
  },
}));

import { LiveClickFeed } from "./live-click-feed";

let root: Root;
let host: HTMLDivElement;

function click(id: number, bot: boolean): LiveClick {
  return { id, occurredAt: "2026-11-02T09:00:00Z", countryCode: "KR", deviceClass: "iOS", channel: "kakao", bot };
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  calls.length = 0;
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function render(value: UseClickStreamResult) {
  stream.value = value;
  await act(async () => root.render(<LiveClickFeed shortCode="abc1234" />));
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
    expect(rows[0].textContent).toContain("KR · iOS · kakao");
    expect(rows[0].textContent).toContain("live.bot");
    expect(rows[1].textContent).not.toContain("live.bot");
    expect(host.querySelector('[class*="border"][class*="rounded"]')).toBeNull();
  });

  it("listens through the signed-in stream path", async () => {
    await render({ items: [], connected: false, reconnecting: false, count: 0 });
    expect(calls[0][0]).toBe("abc1234");
    expect((calls[0][1] as { claimToken?: string }).claimToken).toBeUndefined();
  });
});
