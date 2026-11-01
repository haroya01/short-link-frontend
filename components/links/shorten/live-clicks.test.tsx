import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveClick, UseClickStreamResult } from "@/hooks/use-click-stream";

const stream = vi.hoisted(() => ({ value: { items: [], connected: false, reconnecting: false, count: 0 } as UseClickStreamResult }));
const calls = vi.hoisted(() => [] as unknown[][]);

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`,
}));
vi.mock("@/hooks/use-click-stream", () => ({
  useClickStream: (...args: unknown[]) => {
    calls.push(args);
    return stream.value;
  },
}));

import { LiveClicks } from "./live-clicks";

let root: Root;
let host: HTMLDivElement;

function click(id: number, bot: boolean, countryCode = "KR"): LiveClick {
  return { id, occurredAt: "2026-11-01T09:00:00Z", countryCode, deviceClass: "iOS", channel: "instagram", bot };
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
  await act(async () => root.render(<LiveClicks shortCode="abc1234" claimToken="claim-1" />));
}

describe("LiveClicks", () => {
  it("listens with the link's own claim token, never the account session", async () => {
    await render({ items: [], connected: false, reconnecting: false, count: 0 });
    expect(calls[0]).toEqual(["abc1234", { claimToken: "claim-1", maxItems: 200 }]);
  });

  it("stays silent until the stream is open, so a dead stream adds no noise", async () => {
    await render({ items: [], connected: false, reconnecting: true, count: 0 });
    expect(host.querySelector('[data-testid="live-clicks"]')).toBeNull();
  });

  it("says it is waiting once the stream is open and nothing has landed", async () => {
    await render({ items: [], connected: true, reconnecting: false, count: 0 });
    expect(host.textContent).toBe("result.liveWaiting");
  });

  it("counts people and bots apart and shows where the latest click came from", async () => {
    await render({ items: [click(3, false), click(2, true, "US"), click(1, false)], connected: true, reconnecting: false, count: 3 });
    const text = host.textContent ?? "";
    expect(text).toContain('result.liveCount:{"count":2}');
    expect(text).toContain('result.liveBots:{"count":1}');
    expect(text).toContain("KR · iOS · instagram");
  });

  it("keeps what landed after the stream drops", async () => {
    await render({ items: [click(1, false)], connected: false, reconnecting: true, count: 1 });
    expect(host.textContent).toContain('result.liveCount:{"count":1}');
  });
});
